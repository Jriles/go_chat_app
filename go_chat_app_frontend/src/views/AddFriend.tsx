import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const AddFriend: React.FC = () => {
    const { user_id } = useParams<{ user_id: string }>()
    const [email, setEmail] = useState('')

    const handleAddFriend = async () => {
        try {
            await axios.post(`http://localhost:8080/users/${user_id}/friends`, { email })
            alert('Friend added successfully!')
            setEmail('')
        } catch (error) {
            console.error('Error adding friend:', error)
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Add a Friend</h1>
            <div className="mb-4">
                <input
                    type="email"
                    placeholder="Friend's Email"
                    className="border p-2 w-full mb-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button className="bg-blue-500 text-white p-2 w-full" onClick={handleAddFriend}>
                    Add Friend
                </button>
            </div>
        </div>
    )
}

export default AddFriend

