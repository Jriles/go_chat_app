import React from 'react'

const Home: React.FC = () => {
    return (
        <div className="max-w-md mx-auto">
            <div className="text-2xl font-bold mb-6">Thanks for checking out my chat application!</div>
	    <div className="text-xl mb-4">This app represents the frontend of my react-ts/go/neo4j project. Here's how to give it a try:</div>
	    <ul className="list-disc list-inside space-y-2 text-gray-800">
		<li>
			<span className="font-bold">Login</span> with the first user by clicking Login at the top, and enter
			<span className="font-semibold text-blue-600 ml-1">firstuser@example.com</span>.
		</li>
		<li>
			Open a new tab, and repeat the process with the email:
			<span className="font-semibold text-blue-600 ml-1">seconduser@example.com</span>.
		</li>
		<li>
			Then, click the chat button next to 
			<span className="font-semibold mx-1">First User</span> 
			in your friends list view.
		</li>
		<li>
			Go back to the first tab, refresh the page, and click chat next to
			<span className="font-semibold ml-1">Second User</span>.
		</li>
		<li>Start chatting!</li>
	    </ul>
	    <div className="mt-4">Alternatively, you can create new users and make friends by entering the email of the user you wish to become friends with.</div>
    	</div>
    )
}

export default Home 

