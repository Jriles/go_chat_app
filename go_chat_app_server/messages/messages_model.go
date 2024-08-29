package messages

type ChatMessage struct {
	Content string `json:"content"`
	Persist bool   `json:"persist"`
}
