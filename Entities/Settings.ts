{
  "name": "Settings",
  "type": "object",
  "properties": {
    "setting_key": {
      "type": "string",
      "description": "Unique identifier for the setting"
    },
    "setting_value": {
      "type": "boolean",
      "description": "Boolean value for the setting"
    }
  },
  "required": [
    "setting_key"
  ]
}