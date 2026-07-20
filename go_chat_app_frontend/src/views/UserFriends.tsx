import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../constants'

interface LastMessagePreview {
    type: 'text' | 'file'
    content?: string
    fileName?: string
    timestamp: string | number
    read?: boolean
}

interface Friend {
    id: string
    name: string
    email: string
    lastMessage?: LastMessagePreview
    unreadCount?: number
}

const renderPreview = (friend: Friend) => {
    const msg = friend.lastMessage
    if (!msg) return 'No messages yet'
    if (msg.type === 'file') return `\u{1F4CE} ${msg.fileName ?? 'File'}`
    return msg.content
}

const FriendsList: React.FC = () => {
    const { user_id } = useParams<{ user_id: string }>()
    const [friends, setFriends] = useState<Friend[]>([])

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axios.get<Friend[]>(`${API_BASE_URL}/users/${user_id}/friends`)

                const friendsWithPreviews = await Promise.all(
                    response.data.map(async (friend) => {
                        try {
                            const messagesResponse = await axios.get(`${API_BASE_URL}/users/${user_id}/friends/${friend.id}/messages`)
                            const { sentMessages, receivedMessages } = messagesResponse.data
                            const allMessages: LastMessagePreview[] = [...sentMessages, ...receivedMessages]
                            allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            const unreadCount = receivedMessages.filter((msg: LastMessagePreview) => msg.read === false).length
                            return { ...friend, lastMessage: allMessages[0], unreadCount }
                        } catch (error) {
                            console.error(`Error fetching messages for friend ${friend.id}:`, error)
                            return friend
                        }
                    })
                )

                setFriends(friendsWithPreviews)
            } catch (error) {
                console.error('Error fetching friends:', error)
            }
        }

        fetchFriends()
    }, [user_id])

    return (
        <div className="max-w-md mx-auto">
	    <div className="flex flex-row justify-between">
		<h1 className="text-2xl font-bold mb-4">Friends List</h1>
		<Link
			to={`/users/${user_id}/add-friend`}
		    >
		    <button className="bg-green-500 text-white p-2 rounded">
			Add Friend
		    </button>
		</Link>
	    </div>
            <ul className="space-y-2">
                {friends.map((friend) => (
                    <li key={friend.id}>
                        <Link
                            to={`/users/${user_id}/friends/${friend.id}/chat`}
                            className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-100 hover:border-blue-500 transition-colors cursor-pointer"
                        >
                            <div className="min-w-0">
                                <p className="font-bold">{friend.name}</p>
                                <p className="text-sm text-gray-500 truncate">{renderPreview(friend)}</p>
                            </div>
                            {!!friend.unreadCount && (
                                <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 ml-2 shrink-0">
                                    {friend.unreadCount}
                                </span>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default FriendsList
