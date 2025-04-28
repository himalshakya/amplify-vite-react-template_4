/*== STEP 3 ===============================================================
Implement the logic for the custom mutation handler.
=========================================================================*/
// Create a new file: amplify/data/createTodosHandler.ts

import { AppSyncIdentity, AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto'; // Use crypto for UUID generation

// Type for the input arguments of the mutation
type CreateTodosArgs = {
    todos: {
        title: string;
        content?: string | null; // Match schema (optional string)
    }[];
};

// Type for the result of the mutation (array of created Todos)
// Adjust based on what 'Todo' model includes (id, createdAt, updatedAt are auto-added)
type Todo = {
    id: string;
    title: string;
    content?: string | null;
    owner?: string | null; // Include if owner auth is used
    createdAt: string;
    updatedAt: string;
};

// Environment variable for the DynamoDB table name (set automatically by Amplify)
const tableName = process.env.AMPLIFY_DATA_RESOURCE_TABLE_NAME!; // Add '!' for non-null assertion

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Handler function for the AppSync resolver
export const handler: AppSyncResolverHandler<CreateTodosArgs, Todo[] | null> = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2)); // Log incoming event

    const todosInput = event.arguments.todos;
    const identity = event.identity as AppSyncIdentity; // Get caller identity
    const owner = identity?.sub; // Use 'sub' (user identifier) as the owner

    if (!todosInput || todosInput.length === 0) {
        console.log("No todos provided in input.");
        return []; // Return empty array if input is empty
    }

    if (!owner && identity?.resolverContext?.issuer !== 'apiKey') { // Check if owner exists unless it's an API Key call
         console.error("User is not authenticated or owner information is missing.");
         // Depending on your auth rules, you might throw an error or handle differently
         // If owner field is mandatory for your logic/auth:
         throw new Error("Authentication required to create todos.");
    }

    const createdTodos: Todo[] = [];
    const putPromises: Promise<any>[] = [];

    const now = new Date().toISOString(); // Get current timestamp

    for (const todoInput of todosInput) {
        const todoId = randomUUID(); // Generate a unique ID for each new Todo
        const newTodoItem: Todo = {
            id: todoId,
            title: todoInput.title,
            content: todoInput.content ?? null, // Handle possible undefined/null
            // __typename: 'Todo', // Important for AppSync/GraphQL
            createdAt: now,
            updatedAt: now,
            // Include owner only if identity exists and owner auth is configured
            ...(owner && { owner: owner }),
        };

         // Add __typename if your schema expects it for interface/union resolution,
         // or if client-side caching relies on it. Often needed.
        const itemWithTypename = { ...newTodoItem, __typename: 'Todo' };


        const putCommand = new PutCommand({
            TableName: tableName,
            Item: itemWithTypename,
            ConditionExpression: 'attribute_not_exists(id)', // Prevent overwriting existing items
        });

        // Add the put operation promise to the array
        putPromises.push(
            docClient.send(putCommand).then(() => {
                createdTodos.push(newTodoItem); // Add successfully created item to result array
                console.log(`Successfully put Todo item ${todoId}`);
            }).catch(error => {
                // Handle potential errors, e.g., condition check failure
                console.error(`Failed to put Todo item for input: ${JSON.stringify(todoInput)}`, error);
                // Decide error handling: throw, log, skip, etc.
                // For simplicity, we log and continue; consider more robust error handling.
            })
        );
    }

    try {
        // Wait for all put operations to complete
        await Promise.all(putPromises);
        console.log(`Batch create finished. Successfully created ${createdTodos.length} todos.`);
        return createdTodos; // Return the array of successfully created Todo objects
    } catch (error) {
        console.error("Error during batch create process:", error);
        // Throw a general error or return null/empty array based on desired behavior
        throw new Error("Failed to create one or more todos.");
    }
};