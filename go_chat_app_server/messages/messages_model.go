package messages

type ChatMessage struct {
	Content string `json:"content"`
	Persist bool   `json:"persist"`
}

type FileMessage struct {
	Type      string `json:"type"`
	FileUrl   string `json:"fileUrl"`
	FileName  string `json:"fileName"`
	MimeType  string `json:"mimeType"`
	Timestamp string `json:"timestamp"`
}
