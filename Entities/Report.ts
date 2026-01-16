{
  "name": "Report",
  "type": "object",
  "properties": {
    "reported_item_id": {
      "type": "string",
      "description": "ID of the reported post or comment"
    },
    "reported_item_type": {
      "type": "string",
      "enum": [
        "Post",
        "Comment"
      ],
      "description": "Type of content being reported"
    },
    "reason": {
      "type": "string",
      "enum": [
        "Harassment or Bullying",
        "Hate Speech",
        "Violence/Threats",
        "Self-Harm/Suicide",
        "Nudity or Sexual Content",
        "Spam or Scams",
        "Intellectual Property Infringement",
        "Impersonation",
        "Privacy Violation",
        "Graphic Content/Gore",
        "Illegal Activity",
        "Other"
      ],
      "description": "Reason for reporting"
    },
    "details": {
      "type": "string",
      "description": "Additional details about the report"
    },
    "reporter_anonymous_id": {
      "type": "string",
      "description": "Anonymous ID of the reporter"
    },
    "status": {
      "type": "string",
      "enum": [
        "Pending",
        "Reviewed",
        "Resolved",
        "Dismissed"
      ],
      "default": "Pending",
      "description": "Current status of the report"
    },
    "reviewed_by_admin_email": {
      "type": "string",
      "description": "Email of admin who reviewed the report"
    },
    "review_notes": {
      "type": "string",
      "description": "Admin notes on the report"
    }
  },
  "required": [
    "reported_item_id",
    "reported_item_type",
    "reason",
    "reporter_anonymous_id"
  ]
}