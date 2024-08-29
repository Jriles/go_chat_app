import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { User } from '../constants'

const CreateUser: React.FC = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const navigate = useNavigate()

    const handleCreateUser = async () => {
        try {
            const result = await axios.post('http://localhost:8080/users', { name, email })
            const userData: User = result.data
            navigate(`/users/${userData.id}/friends`)
        } catch (error) {
            console.error('Error creating user:', error)
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Create User</h1>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Name"
                    className="border p-2 w-full mb-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    type="email"
                    placeholder="Email"
                    className="border p-2 w-full mb-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button className="bg-green-500 text-white p-2 w-full" onClick={handleCreateUser}>
                    Create User
                </button>
            </div>
        </div>
    )
}

export default CreateUser

