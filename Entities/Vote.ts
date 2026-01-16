{
  "name": "Vote",
  "type": "object",
  "properties": {
    "post_id": {
      "type": "string",
      "description": "ID of the post being voted on"
    },
    "option_index": {
      "type": "number",
      "description": "Index of the option voted for (for comparison posts)"
    },
    "rating": {
      "type": "number",
      "description": "Star rating 1-5 (for single review posts)"
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