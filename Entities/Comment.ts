{
  "name": "Comment",
  "type": "object",
  "properties": {
    "post_id": {
      "type": "string",
      "description": "ID of the post being commented on"
    },
    "content": {
      "type": "string",
      "description": "Comment text (max 140 chars)"
    },
    "anonymous_name": {
      "type": "string",
      "description": "Anonymous display name"
    },
    "is_hidden": {
      "type": "boolean",
      "default": false,
      "description": "Whether the comment is hidden by admin"
    }
  },
  "required": [
    "post_id",
    "content"
  ]
}