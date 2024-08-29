import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

interface Friend {
    id: string
    name: string
    email: string
}

const FriendsList: React.FC = () => {
    const { user_id } = useParams<{ user_id: string }>()
    const [friends, setFriends] = useState<Friend[]>([])

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axios.get<Friend[]>(`http://localhost:8080/users/${user_id}/friends`)
                setFriends(response.data)
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
            <ul className="list-disc pl-5">
                {friends.map((friend) => (
                    <li key={friend.id} className="mb-2 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{friend.name}</p>
                            <p>{friend.email}</p>
                        </div>
                        <Link
                            to={`/users/${user_id}/friends/${friend.id}/chat`}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Chat
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default FriendsList

