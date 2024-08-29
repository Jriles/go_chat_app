CREATE (user1:User {
    id: '64FBEAF1-D1FF-4AFA-88CA-809A403851F5',
    name: 'First User',
    email: 'firstuser@example.com'
})
CREATE (user2:User {
    id: '0DE5365D-A6F1-458E-BD33-9403751EE350',
    name: 'Second User',
    email: 'seconduser@example.com'
})
CREATE (user1)-[:FRIENDS_WITH]->(user2),
       (user2)-[:FRIENDS_WITH]->(user1)
RETURN user1, user2

