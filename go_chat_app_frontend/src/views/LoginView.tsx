import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const LoginView: React.FC = () => {
    const [email, setEmail] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/users/email/${email}`)
            const userId = response.data.id
            sessionStorage.removeItem('user_id')
            sessionStorage.setItem('user_id', userId)
            setError(null)
            navigate(`/users/${userId}/friends`)
        } catch (error) {
            console.error('Error logging in:', error)
            setError('User not found or failed to login.')
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            <input
                type="email"
                placeholder="Enter your email"
                className="border p-2 w-full mb-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button
                className="bg-blue-500 text-white p-2 w-full"
                onClick={handleLogin}
            >
                Login
            </button>
        </div>
    )
}

export default LoginView

