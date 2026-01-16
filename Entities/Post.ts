{
  "name": "Post",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "comparison"
      ],
      "default": "comparison",
      "description": "Type of post - comparison or single review"
    },
    "title": {
      "type": "string",
      "description": "The question or title of the post (optional)"
    },
    "images": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1,
      "maxItems": 3,
      "description": "Array of image URLs (1-3)"
    },
    "options": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Labels for each image option (for comparison posts)"
    },
    "votes": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Vote counts for each option (for comparison posts)"
    },
    "total_votes": {
      "type": "number",
      "default": 0,
      "description": "Total number of votes"
    },
    "comment_count": {
      "type": "number",
      "default": 0,
      "description": "Number of comments"
    },
    "is_hidden": {
      "type": "boolean",
      "default": false,
      "description": "Whether the post is hidden by admin"
    }
  },
  "required": [
    "images",
    "type"
  ]
}
