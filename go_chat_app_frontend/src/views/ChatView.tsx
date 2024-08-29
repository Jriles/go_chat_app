import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

interface Message {
    content: string
    timestamp: string
    sentByUser: boolean
}

const ChatView: React.FC = () => {
    const { user_id, friend_id } = useParams<{ user_id: string, friend_id: string }>()
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [friendName, setFriendName] = useState<string>('')
    const [friendStatus, setFriendStatus] = useState<string>('offline')
    const [keepMessage, setKeepMessage] = useState(true)
    const socket = useRef<WebSocket | null>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        const fetchFriendDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/users/${user_id}/friends/${friend_id}`)
                setFriendName(response.data.name)

                const statusResponse = await axios.get(`http://localhost:8080/users/${friend_id}/status`)
                setFriendStatus(statusResponse.data.status)
            } catch (error) {
                console.error('Error fetching friend details or status:', error)
            }
        }

        const fetchMessages = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/users/${user_id}/friends/${friend_id}/messages`)
                const { sentMessages, receivedMessages } = response.data

                const combinedMessages = [
                    ...sentMessages.map((msg: { content: string, timestamp: string }) => ({
                        content: msg.content,
                        timestamp: msg.timestamp,
                        sentByUser: true
                    })),
                    ...receivedMessages.map((msg: { content: string, timestamp: string }) => ({
                        content: msg.content,
                        timestamp: msg.timestamp,
                        sentByUser: false
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
        socket.current = new WebSocket(`ws://localhost:8080/ws/${user_id}/friends/${friend_id}`)

        socket.current.onopen = () => {
            console.log('WebSocket connection established')
        }

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.status) {
                setFriendStatus(data.status)
            } else {
                const newMessage: Message = {
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
                const updatedMessages = [...prevMessages, { content: message, timestamp: messageObj.timestamp, sentByUser: true }]
                updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                return updatedMessages
            })
            setMessage('')
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-1">Chat with {friendName}</h1>
            <p className="text-sm text-gray-500 mb-4">
                {friendStatus === 'typing' ? 'Typing...' : friendStatus === 'online' ? 'Online' : 'Offline'}
            </p>
	    <div className="border p-4 mt-4 h-64 overflow-y-scroll flex flex-col" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`mb-2 p-2 rounded-lg max-w-xs ${msg.sentByUser ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-300 text-black mr-auto'}`}
                    >
                        {msg.content}
                    </div>
                ))}
            </div>
            <textarea
                className="border p-2 w-full mt-4"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
		placeholder="Message..."
            />
            <button
                className="bg-blue-500 text-white p-2 w-full mt-2"
                onClick={sendMessage}
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

