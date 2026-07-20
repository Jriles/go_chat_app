import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL, WS_BASE_URL } from '../constants'

interface Message {
    content?: string
    timestamp: string
    sentByUser: boolean
    type: 'text' | 'file'
    fileUrl?: string
    fileName?: string
    mimeType?: string
}

const ChatView: React.FC = () => {
    const { user_id, friend_id } = useParams<{ user_id: string, friend_id: string }>()
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [friendName, setFriendName] = useState<string>('')
    const [friendStatus, setFriendStatus] = useState<string>('offline')
    const [keepMessage, setKeepMessage] = useState(true)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const socket = useRef<WebSocket | null>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        const fetchFriendDetails = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/users/${user_id}/friends/${friend_id}`)
                setFriendName(response.data.name)

                const statusResponse = await axios.get(`${API_BASE_URL}/users/${friend_id}/status`)
                setFriendStatus(statusResponse.data.status)
            } catch (error) {
                console.error('Error fetching friend details or status:', error)
            }
        }

        const fetchMessages = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/users/${user_id}/friends/${friend_id}/messages`)
                const { sentMessages, receivedMessages } = response.data

                type RawMessage = { content?: string, timestamp: string, type?: 'text' | 'file', fileUrl?: string, fileName?: string, mimeType?: string }

                const combinedMessages = [
                    ...sentMessages.map((msg: RawMessage) => ({
                        content: msg.content,
                        timestamp: msg.timestamp,
                        sentByUser: true,
                        type: msg.type ?? 'text',
                        fileUrl: msg.fileUrl,
                        fileName: msg.fileName,
                        mimeType: msg.mimeType
                    })),
                    ...receivedMessages.map((msg: RawMessage) => ({
                        content: msg.content,
                        timestamp: msg.timestamp,
                        sentByUser: false,
                        type: msg.type ?? 'text',
                        fileUrl: msg.fileUrl,
                        fileName: msg.fileName,
                        mimeType: msg.mimeType
                    }))
                ]

                combinedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

                setMessages(combinedMessages)
            } catch (error) {
                console.error('Error fetching messages:', error)
            }
        }

        fetchMessages()
        fetchFriendDetails()
    }, [user_id, friend_id])

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        socket.current = new WebSocket(`${WS_BASE_URL}/ws/${user_id}/friends/${friend_id}`)

        socket.current.onopen = () => {
            console.log('WebSocket connection established')
        }

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.status) {
                if (data.userID === friend_id) {
                    setFriendStatus(data.status)
                }
            } else {
                const newMessage: Message = data.type === 'file'
                    ? {
                        type: 'file',
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        mimeType: data.mimeType,
                        timestamp: data.timestamp ?? new Date().toISOString(),
                        sentByUser: false
                    }
                    : {
                        type: 'text',
                        content: data.content,
                        timestamp: new Date().toISOString(),
                        sentByUser: false
                    }
                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, newMessage]
                    updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    return updatedMessages
                })
            }
        }

        socket.current.onclose = () => {
            console.log('WebSocket closed')
            setFriendStatus('offline')
        }

        socket.current.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

    }, [user_id, friend_id])

    const sendMessage = () => {
        if (socket.current && message.trim() !== '') {
            const messageObj = {
                content: message,
                timestamp: new Date().toISOString(),
                persist: keepMessage
            }
            socket.current.send(JSON.stringify(messageObj))
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, { type: 'text' as const, content: message, timestamp: messageObj.timestamp, sentByUser: true }]
                updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                return updatedMessages
            })
            setMessage('')
        }
    }

    const handleFileUploadBtnClick = () => {
	if (fileInputRef.current) {
	    fileInputRef.current.click();
	}
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
        }
    }

    const removeSelectedFile = () => {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const uploadSelectedFile = async () => {
        if (!selectedFile) return

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('persist', String(keepMessage))

        try {
            const response = await axios.post(
                `${API_BASE_URL}/users/${user_id}/friends/${friend_id}/upload`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            const { fileUrl, fileName, mimeType, timestamp } = response.data
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, { type: 'file' as const, fileUrl, fileName, mimeType, timestamp, sentByUser: true }]
                updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                return updatedMessages
            })
        } catch (error) {
            console.error('Error uploading file:', error)
        } finally {
            removeSelectedFile()
        }
    }

    const handleSend = async () => {
        if (selectedFile) {
            await uploadSelectedFile()
        }
        sendMessage()
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-1">Chat with {friendName}</h1>
            <p className="text-sm text-gray-500 mb-4">
                {friendStatus === 'typing' ? 'Typing...' : friendStatus === 'online' ? 'Online' : 'Offline'}
            </p>
	    <div className="border rounded-lg p-4 mt-4 h-64 overflow-y-scroll flex flex-col" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`mb-2 p-2 rounded-lg max-w-xs ${msg.sentByUser ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-300 text-black mr-auto'}`}
                    >
                        {msg.type === 'file' ? (
                            msg.mimeType?.startsWith('image/') ? (
                                <a href={`${API_BASE_URL}${msg.fileUrl}`} target="_blank" rel="noreferrer">
                                    <img src={`${API_BASE_URL}${msg.fileUrl}`} alt={msg.fileName} className="max-w-full rounded-lg" />
                                </a>
                            ) : msg.mimeType?.startsWith('video/') ? (
                                <video
                                    src={`${API_BASE_URL}${msg.fileUrl}`}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="max-w-full rounded-lg"
                                />
                            ) : (
                                <a href={`${API_BASE_URL}${msg.fileUrl}`} target="_blank" rel="noreferrer" className="underline break-all">
                                    {msg.fileName}
                                </a>
                            )
                        ) : (
                            msg.content
                        )}
                    </div>
                ))}
            </div>
	    <div className="flex flex-row pt-4 gap-2">
		<textarea
		    className="border p-2 w-full rounded-lg w-max"
		    rows={3}
		    value={message}
		    onChange={(e) => setMessage(e.target.value)}
		    placeholder="Message..."
		/>
		<button onClick={handleFileUploadBtnClick} className="border h-100 px-12 rounded-lg hover:bg-gray-300">Upload File</button>
	    </div>
	    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="opacity-0 w-0"/>
            {selectedFile && (
                <div className="flex items-center justify-between text-sm text-gray-600 mt-1 px-1">
                    <span className="truncate">{selectedFile.name}</span>
                    <button onClick={removeSelectedFile} className="text-red-500 ml-2">Remove</button>
                </div>
            )}
            <button
                className="bg-blue-500 text-white p-2 w-full mt-2 rounded-lg"
                onClick={handleSend}
            >
                Send
            </button>
            <div className="flex items-center mt-2">
                <input
                    type="checkbox"
                    checked={keepMessage}
                    onChange={(e) => setKeepMessage(e.target.checked)}
                />
                <label className="ml-2">
                    Keep message
                </label>
            </div>
        </div>
    )
}

export default ChatView

