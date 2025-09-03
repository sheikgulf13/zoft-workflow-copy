# Flow Operations API Documentation

This document provides comprehensive information about all 19 flow operation types and their specific request data requirements for the Flow API.

## API Endpoint

```
POST /api/projects/:projectId/flows/:id
```

## Request Structure

All operations follow this basic structure:

```typescript
{
  "type": "OPERATION_TYPE",
  "request": {
    // Operation-specific data
  }
}
```

---

## 1. LOCK_AND_PUBLISH

**Purpose**: Locks the current draft version and publishes it, optionally enabling the flow.

**Request Structure**:
```typescript
{
  "type": "LOCK_AND_PUBLISH",
  "request": {
    "status": "ENABLED" | "DISABLED"  // optional
  }
}
```

**Example**:
```json
{
  "type": "LOCK_AND_PUBLISH",
  "request": {
    "status": "ENABLED"
  }
}
```

---

## 2. CHANGE_STATUS

**Purpose**: Changes the flow status to enabled or disabled.

**Request Structure**:
```typescript
{
  "type": "CHANGE_STATUS",
  "request": {
    "status": "ENABLED" | "DISABLED"
  }
}
```

**Example**:
```json
{
  "type": "CHANGE_STATUS",
  "request": {
    "status": "ENABLED"
  }
}
```

---

## 3. CHANGE_FOLDER

**Purpose**: Moves the flow to a different folder or removes it from a folder.

**Request Structure**:
```typescript
{
  "type": "CHANGE_FOLDER",
  "request": {
    "folderId": "string" | null
  }
}
```

**Example**:
```json
{
  "type": "CHANGE_FOLDER",
  "request": {
    "folderId": "folder_123"
  }
}
```

---

## 4. CHANGE_NAME

**Purpose**: Changes the display name of the flow.

**Request Structure**:
```typescript
{
  "type": "CHANGE_NAME",
  "request": {
    "displayName": "string"
  }
}
```

**Example**:
```json
{
  "type": "CHANGE_NAME",
  "request": {
    "displayName": "Updated Flow Name"
  }
}
```

---

## 5. MOVE_ACTION

**Purpose**: Moves an action to a different location within the flow.

**Request Structure**:
```typescript
{
  "type": "MOVE_ACTION",
  "request": {
    "name": "string",
    "newParentStep": "string",
    "stepLocationRelativeToNewParent": "AFTER" | "INSIDE_LOOP" | "INSIDE_BRANCH",  // optional
    "branchIndex": number  // optional
  }
}
```

**Example**:
```json
{
  "type": "MOVE_ACTION",
  "request": {
    "name": "send_email_action",
    "newParentStep": "trigger_step",
    "stepLocationRelativeToNewParent": "AFTER",
    "branchIndex": 0
  }
}
```

---

## 6. IMPORT_FLOW

**Purpose**: Imports a flow with a specific trigger and configuration.

**Request Structure**:
```typescript
{
  "type": "IMPORT_FLOW",
  "request": {
    "displayName": "string",
    "trigger": {
      // Trigger object (see trigger structures below)
    },
    "schemaVersion": "string" | null  // optional
  }
}
```

**Example**:
```json
{
  "type": "IMPORT_FLOW",
  "request": {
    "displayName": "Imported Flow",
    "trigger": {
      "name": "webhook_trigger",
      "valid": true,
      "displayName": "Webhook Trigger",
      "type": "WEBHOOK",
      "settings": {
        "inputUiInfo": {
          "currentSelectedData": "sample_data",
          "customizedInputs": {}
        }
      }
    },
    "schemaVersion": "1.0.0"
  }
}
```

---

## 7. UPDATE_TRIGGER

**Purpose**: Updates the flow trigger configuration.

**Request Structure**:
```typescript
{
  "type": "UPDATE_TRIGGER",
  "request": {
    // One of the trigger types below:
    
    // Empty Trigger
    "name": "string",
    "valid": boolean,
    "displayName": "string",
    "skip": boolean,  // optional
    "customLogoUrl": "string",  // optional
    "type": "EMPTY",
    "settings": {
      "inputUiInfo": {
        "currentSelectedData": "string",  // optional
        "customizedInputs": { [key: string]: any }  // optional
      }  // optional
    }
    
    // OR Piece Trigger
    "name": "string",
    "valid": boolean,
    "displayName": "string",
    "skip": boolean,  // optional
    "customLogoUrl": "string",  // optional
    "type": "PIECE",
    "settings": {
      "pieceName": "string",
      "pieceVersion": "string",
      "triggerName": "string",
      "input": { [key: string]: unknown },
      "inputUiInfo": {
        "currentSelectedData": "string",  // optional
        "customizedInputs": { [key: string]: any }  // optional
      }
    }
    
    // OR Webhook Trigger
    "name": "string",
    "valid": boolean,
    "displayName": "string",
    "skip": boolean,  // optional
    "customLogoUrl": "string",  // optional
    "type": "WEBHOOK",
    "settings": {
      "inputUiInfo": {
        "currentSelectedData": "string",  // optional
        "customizedInputs": { [key: string]: any }  // optional
      }
    }
    
    // OR Schedule Trigger
    "name": "string",
    "valid": boolean,
    "displayName": "string",
    "skip": boolean,  // optional
    "customLogoUrl": "string",  // optional
    "type": "SCHEDULE",
    "settings": {
      "scheduleType": "EVERY_MINUTE" | "EVERY_HOUR" | "EVERY_DAY" | "EVERY_WEEK" | "EVERY_MONTH" | "CUSTOM",
      "cronExpression": "string",
      "timezone": "string",  // optional
      "inputUiInfo": {
        "currentSelectedData": "string",  // optional
        "customizedInputs": { [key: string]: any }  // optional
      }  // optional
    }
  }
}
```

**Example (Piece Trigger)**:
```json
{
  "type": "UPDATE_TRIGGER",
  "request": {
    "name": "gmail_trigger",
    "valid": true,
    "displayName": "Gmail Trigger",
    "type": "PIECE",
    "settings": {
      "pieceName": "gmail",
      "pieceVersion": "1.0.0",
      "triggerName": "new_email",
      "input": {
        "label": "INBOX"
      },
      "inputUiInfo": {
        "currentSelectedData": "sample_data",
        "customizedInputs": {}
      }
    }
  }
}
```

---

## 8. ADD_ACTION

**Purpose**: Adds a new action to the flow.

**Request Structure**:
```typescript
{
  "type": "ADD_ACTION",
  "request": {
    "parentStep": "string",
    "stepLocationRelativeToParent": "AFTER" | "INSIDE_LOOP" | "INSIDE_BRANCH",  // optional
    "branchIndex": number,  // optional
    "action": {
      // One of the action types below:
      
      // Code Action
      "name": "string",
      "valid": boolean,
      "displayName": "string",
      "skip": boolean,  // optional
      "customLogoUrl": "string",  // optional
      "type": "CODE",
      "settings": {
        "sourceCode": {
          "packageJson": "string",
          "code": "string"
        },
        "input": { [key: string]: any },
        "inputUiInfo": {
          "currentSelectedData": "string",  // optional
          "customizedInputs": { [key: string]: any }  // optional
        },  // optional
        "errorHandlingOptions": {
          "continueOnFailure": {
            "value": boolean
          },  // optional
          "retryOnFailure": {
            "value": boolean
          }  // optional
        }  // optional
      }
      
      // OR Piece Action
      "name": "string",
      "valid": boolean,
      "displayName": "string",
      "skip": boolean,  // optional
      "customLogoUrl": "string",  // optional
      "type": "PIECE",
      "settings": {
        "pieceName": "string",
        "pieceVersion": "string",
        "actionName": "string",  // optional
        "input": { [key: string]: unknown },
        "inputUiInfo": {
          "currentSelectedData": "string",  // optional
          "customizedInputs": { [key: string]: any }  // optional
        },
        "errorHandlingOptions": {
          "continueOnFailure": {
            "value": boolean
          },  // optional
          "retryOnFailure": {
            "value": boolean
          }  // optional
        }  // optional
      }
      
      // OR Loop On Items Action
      "name": "string",
      "valid": boolean,
      "displayName": "string",
      "skip": boolean,  // optional
      "customLogoUrl": "string",  // optional
      "type": "LOOP_ON_ITEMS",
      "settings": {
        "items": "string",
        "inputUiInfo": {
          "currentSelectedData": "string",  // optional
          "customizedInputs": { [key: string]: any }  // optional
        }
      }
      
      // OR Router Action
      "name": "string",
      "valid": boolean,
      "displayName": "string",
      "skip": boolean,  // optional
      "customLogoUrl": "string",  // optional
      "type": "ROUTER",
      "settings": {
        "branches": [
          {
            "conditions": [
              [
                {
                  "firstValue": "string",
                  "secondValue": "string",
                  "caseSensitive": boolean,  // optional
                  "operator": "TEXT_CONTAINS" | "TEXT_DOES_NOT_CONTAIN" | "TEXT_EQUALS" | "TEXT_DOES_NOT_EQUAL" | "TEXT_STARTS_WITH" | "TEXT_ENDS_WITH" | "TEXT_REGEX"  // optional
                }
              ]
            ],
            "branchType": "CONDITION",
            "branchName": "string"
          },
          {
            "branchType": "FALLBACK",
            "branchName": "string"
          }
        ],
        "executionType": "FIRST_MATCH" | "ALL_MATCHES",
        "inputUiInfo": {
          "currentSelectedData": "string",  // optional
          "customizedInputs": { [key: string]: any }  // optional
        }
      }
    }
  }
}
```

**Example (Piece Action)**:
```json
{
  "type": "ADD_ACTION",
  "request": {
    "parentStep": "trigger_step",
    "stepLocationRelativeToParent": "AFTER",
    "action": {
      "name": "send_email",
      "valid": true,
      "displayName": "Send Email",
      "type": "PIECE",
      "settings": {
        "pieceName": "gmail",
        "pieceVersion": "1.0.0",
        "actionName": "send_email",
        "input": {
          "to": "{{trigger.email}}",
          "subject": "Hello",
          "body": "Welcome!"
        },
        "inputUiInfo": {
          "currentSelectedData": "sample_data",
          "customizedInputs": {}
        }
      }
    }
  }
}
```

---

## 9. UPDATE_ACTION

**Purpose**: Updates an existing action in the flow.

**Request Structure**:
```typescript
{
  "type": "UPDATE_ACTION",
  "request": {
    // Same action structure as in ADD_ACTION above
    // One of: Code Action, Piece Action, Loop On Items Action, or Router Action
  }
}
```

**Example**:
```json
{
  "type": "UPDATE_ACTION",
  "request": {
    "name": "send_email",
    "valid": true,
    "displayName": "Send Email Updated",
    "type": "PIECE",
    "settings": {
      "pieceName": "gmail",
      "pieceVersion": "1.0.0",
      "actionName": "send_email",
      "input": {
        "to": "{{trigger.email}}",
        "subject": "Updated Subject",
        "body": "Updated body content"
      },
      "inputUiInfo": {
        "currentSelectedData": "sample_data",
        "customizedInputs": {}
      }
    }
  }
}
```

---

## 10. DELETE_ACTION

**Purpose**: Deletes one or more actions from the flow.

**Request Structure**:
```typescript
{
  "type": "DELETE_ACTION",
  "request": {
    "names": ["string"]
  }
}
```

**Example**:
```json
{
  "type": "DELETE_ACTION",
  "request": {
    "names": ["send_email", "log_data"]
  }
}
```

---

## 11. DUPLICATE_ACTION

**Purpose**: Creates a duplicate of an existing action.

**Request Structure**:
```typescript
{
  "type": "DUPLICATE_ACTION",
  "request": {
    "stepName": "string"
  }
}
```

**Example**:
```json
{
  "type": "DUPLICATE_ACTION",
  "request": {
    "stepName": "send_email"
  }
}
```

---

## 12. USE_AS_DRAFT

**Purpose**: Uses a specific version as the current draft.

**Request Structure**:
```typescript
{
  "type": "USE_AS_DRAFT",
  "request": {
    "versionId": "string"
  }
}
```

**Example**:
```json
{
  "type": "USE_AS_DRAFT",
  "request": {
    "versionId": "version_123"
  }
}
```

---

## 13. DELETE_BRANCH

**Purpose**: Deletes a branch from a router action.

**Request Structure**:
```typescript
{
  "type": "DELETE_BRANCH",
  "request": {
    "branchIndex": number,
    "stepName": "string"
  }
}
```

**Example**:
```json
{
  "type": "DELETE_BRANCH",
  "request": {
    "branchIndex": 1,
    "stepName": "router_action"
  }
}
```

---

## 14. ADD_BRANCH

**Purpose**: Adds a new branch to a router action.

**Request Structure**:
```typescript
{
  "type": "ADD_BRANCH",
  "request": {
    "branchIndex": number,
    "stepName": "string",
    "conditions": [
      [
        {
          "firstValue": "string",
          "secondValue": "string",
          "caseSensitive": boolean,  // optional
          "operator": "TEXT_CONTAINS" | "TEXT_DOES_NOT_CONTAIN" | "TEXT_EQUALS" | "TEXT_DOES_NOT_EQUAL" | "TEXT_STARTS_WITH" | "TEXT_ENDS_WITH" | "TEXT_REGEX"  // optional
        }
      ]
    ],  // optional
    "branchName": "string"
  }
}
```

**Example**:
```json
{
  "type": "ADD_BRANCH",
  "request": {
    "branchIndex": 2,
    "stepName": "router_action",
    "conditions": [
      [
        {
          "firstValue": "{{trigger.email}}",
          "secondValue": "@company.com",
          "operator": "TEXT_CONTAINS",
          "caseSensitive": false
        }
      ]
    ],
    "branchName": "Company Email Branch"
  }
}
```

---

## 15. DUPLICATE_BRANCH

**Purpose**: Creates a duplicate of an existing branch.

**Request Structure**:
```typescript
{
  "type": "DUPLICATE_BRANCH",
  "request": {
    "branchIndex": number,
    "stepName": "string"
  }
}
```

**Example**:
```json
{
  "type": "DUPLICATE_BRANCH",
  "request": {
    "branchIndex": 0,
    "stepName": "router_action"
  }
}
```

---

## 16. SET_SKIP_ACTION

**Purpose**: Sets whether actions should be skipped during execution.

**Request Structure**:
```typescript
{
  "type": "SET_SKIP_ACTION",
  "request": {
    "names": ["string"],
    "skip": boolean
  }
}
```

**Example**:
```json
{
  "type": "SET_SKIP_ACTION",
  "request": {
    "names": ["debug_log", "test_action"],
    "skip": true
  }
}
```

---

## 17. UPDATE_METADATA

**Purpose**: Updates the flow's metadata.

**Request Structure**:
```typescript
{
  "type": "UPDATE_METADATA",
  "request": {
    "metadata": { [key: string]: any } | null
  }
}
```

**Example**:
```json
{
  "type": "UPDATE_METADATA",
  "request": {
    "metadata": {
      "description": "This flow processes incoming emails",
      "tags": ["email", "automation"],
      "priority": "high"
    }
  }
}
```

---

## 18. MOVE_BRANCH

**Purpose**: Moves a branch to a different position within a router action.

**Request Structure**:
```typescript
{
  "type": "MOVE_BRANCH",
  "request": {
    "sourceBranchIndex": number,
    "targetBranchIndex": number,
    "stepName": "string"
  }
}
```

**Example**:
```json
{
  "type": "MOVE_BRANCH",
  "request": {
    "sourceBranchIndex": 0,
    "targetBranchIndex": 2,
    "stepName": "router_action"
  }
}
```

---

## 19. SAVE_SAMPLE_DATA

**Purpose**: Saves sample data for a specific step.

**Request Structure**:
```typescript
{
  "type": "SAVE_SAMPLE_DATA",
  "request": {
    "stepName": "string",
    "sampleData": any
  }
}
```

**Example**:
```json
{
  "type": "SAVE_SAMPLE_DATA",
  "request": {
    "stepName": "send_email",
    "sampleData": {
      "email": "test@example.com",
      "subject": "Test Subject",
      "body": "Test body content"
    }
  }
}
```

---

## Frontend Implementation Examples

### JavaScript/TypeScript Example

```typescript
// Enable a flow
const enableFlow = async (projectId: string, flowId: string) => {
  const response = await fetch(`/api/projects/${projectId}/flows/${flowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'CHANGE_STATUS',
      request: {
        status: 'ENABLED'
      }
    })
  });
  
  return response.json();
};

// Add a piece action
const addPieceAction = async (projectId: string, flowId: string, parentStep: string) => {
  const response = await fetch(`/api/projects/${projectId}/flows/${flowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'ADD_ACTION',
      request: {
        parentStep: parentStep,
        stepLocationRelativeToParent: 'AFTER',
        action: {
          name: 'send_email',
          valid: true,
          displayName: 'Send Email',
          type: 'PIECE',
          settings: {
            pieceName: 'gmail',
            pieceVersion: '1.0.0',
            actionName: 'send_email',
            input: {
              to: '{{trigger.email}}',
              subject: 'Hello',
              body: 'Welcome!'
            },
            inputUiInfo: {
              currentSelectedData: 'sample_data',
              customizedInputs: {}
            }
          }
        }
      }
    })
  });
  
  return response.json();
};

// Update trigger
const updateTrigger = async (projectId: string, flowId: string) => {
  const response = await fetch(`/api/projects/${projectId}/flows/${flowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'UPDATE_TRIGGER',
      request: {
        name: 'gmail_trigger',
        valid: true,
        displayName: 'Gmail Trigger',
        type: 'PIECE',
        settings: {
          pieceName: 'gmail',
          pieceVersion: '1.0.0',
          triggerName: 'new_email',
          input: {
            label: 'INBOX'
          },
          inputUiInfo: {
            currentSelectedData: 'sample_data',
            customizedInputs: {}
          }
        }
      }
    })
  });
  
  return response.json();
};
```

### cURL Examples

```bash
# Enable a flow
curl -X POST "http://localhost:3000/api/projects/project_123/flows/flow_456" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{
    "type": "CHANGE_STATUS",
    "request": {
      "status": "ENABLED"
    }
  }'

# Add an action
curl -X POST "http://localhost:3000/api/projects/project_123/flows/flow_456" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{
    "type": "ADD_ACTION",
    "request": {
      "parentStep": "trigger_step",
      "stepLocationRelativeToParent": "AFTER",
      "action": {
        "name": "send_email",
        "valid": true,
        "displayName": "Send Email",
        "type": "PIECE",
        "settings": {
          "pieceName": "gmail",
          "pieceVersion": "1.0.0",
          "actionName": "send_email",
          "input": {
            "to": "{{trigger.email}}",
            "subject": "Hello",
            "body": "Welcome!"
          },
          "inputUiInfo": {
            "currentSelectedData": "sample_data",
            "customizedInputs": {}
          }
        }
      }
    }
  }'
```

---

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (no access to project)
- `404` - Not Found (flow or project not found)
- `500` - Internal Server Error

Error responses follow this structure:

```json
{
  "error": "Error message",
  "details": "Additional error details"  // optional
}
```

---

## Authentication

All requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token must have access to the specified project.

---

## Notes

1. **Optional Fields**: Fields marked as `// optional` can be omitted from the request
2. **Type Safety**: The API uses discriminated unions to ensure type safety
3. **Validation**: All requests are validated against their respective schemas
4. **Atomic Operations**: Each operation is atomic and will either succeed completely or fail completely
5. **Versioning**: Flow operations work with the current draft version unless specified otherwise