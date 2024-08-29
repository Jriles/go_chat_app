import React, { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import CreateUser from './views/CreateUser'
import AddFriend from './views/AddFriend'
import FriendsList from './views/UserFriends'
import ChatView from './views/ChatView'
import LoginView from './views/LoginView'
import Home from './views/Home'

const App: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const handleStorageChange = () => {
            const storedUserId = sessionStorage.getItem('user_id')
            setUserId(storedUserId)
        }

	// this is here because we want to reload the navbar after logging in or creating a user
        window.addEventListener('storage', handleStorageChange)
        return () => {
            window.removeEventListener('storage', handleStorageChange)
        }    }, [])
    return (
	<>
	    <nav className="pl-6 mb-4 h-10 items-center flex space-x-8 bg-blue-500 text-white">
		<Link to="/create-user">Create User</Link>
		<Link to="/login">Login</Link>
		{userId !== null && <Link to={"/users/" + userId + "/friends"}>Friends</Link>}
	    </nav>
	    <Routes>
		<Route path="/" element={<Home />} />
		<Route path="/create-user" element={<CreateUser />} />
		<Route path="/users/:user_id/add-friend" element={<AddFriend />} />
		<Route path="/users/:user_id/friends" element={<FriendsList />} />
		<Route path="/users/:user_id/friends/:friend_id/chat" element={<ChatView />} />
		<Route path="/login" element={<LoginView/>}/>
	    </Routes>
	</>
    )
}

export default App

