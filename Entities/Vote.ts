{
  "name": "Vote",
  "type": "object",
  "properties": {
    "post_id": {
      "type": "string",
      "description": "ID of the post being voted on"
    },
    "user_id": {
      "type": "string",
      "description": "ID of the user casting the vote (if logged in)"
    },
    "option_index": {
      "type": "number",
      "description": "Index of the option voted for (for comparison posts)"
    },
    "anonymous_id": {
      "type": "string",
      "description": "Anonymous identifier for the voter"
    }
  },
  "required": [
    "post_id",
    "anonymous_id"
  ]
}
