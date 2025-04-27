import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization(allow => [allow.owner()]),
  
  coursesv2: a.model({
    id: a.id().required(),
    subCategory: a.string().required(),
    institution: a.string(),
    title: a.string(),
    credits: a.integer(),
    prerequisites: a.string().array(),
    corequisitess: a.string().array(),
    includesLab: a.boolean(),
    notes: a.string(),
  }) 
  .authorization(allow => [allow.guest()]),

  State: a.model({
    id: a.id().required(),
    name: a.enum(['CO', 'CT', 'NY']),
    displayName: a.string(),
    Universities: a.hasMany('University', 'stateId'),
  }).authorization(allow => [allow.guest()]),

  University: a.model({
    id: a.id().required(),
    name: a.enum(['COMMUNITY_COLLEGE_OF_AURORA', 'UNIVERSITY_OF_CONNECTICUT', 'DENVER_UNIVERSTITY', 'UNIVERSITY_OF_BRIDGEPORT', 'UNIVERSITY_OF_COLORADO']),
    displayName: a.string(),
    stateId: a.id(),
    state: a.belongsTo('State', 'stateId'),
    majors: a.hasMany('MajorUniversity', 'universityId'),
    categories: a.hasMany('Category', 'universityId'),
    students: a.hasMany('Student', 'universityId'),
  })
  .authorization(allow => [allow.guest()]),

  Major: a.model({
    id: a.id().required(),
    name: a.string(),
    minCredit: a.string(),
    categories: a.hasMany('Category', 'majorId'),
    universities: a.hasMany('MajorUniversity', 'majorId'),
    student: a.hasOne('Student', 'majorId'),
  })
  .authorization(allow => [allow.guest()]),

  Category: a.model({
    id: a.id().required(),
    minCredit: a.integer(),
    name: a.string(),
    majorId: a.id(),
    major: a.belongsTo('Major', 'majorId'),
    universityId: a.id(),
    university: a.belongsTo('University', 'universityId'),
    subCategories: a.hasMany('SubCategory', 'categoryId'),
    categories: a.hasMany('Course', 'categoryId'),
  })
  .authorization(allow => [allow.guest()]),

  SubCategory: a.model({
    id: a.id().required(),
    name: a.string(),
    code: a.string(),
    categoryId: a.id(),
    category: a.belongsTo('Category', 'categoryId'),
    courses: a.hasMany('Course', 'subCategoryId'),
  })
  .authorization(allow => [allow.guest()]),

  Course: a.model({
    id: a.id().required(),
    code: a.string(),
    name: a.string(),
    credit: a.integer(),
    categoryId: a.id(),
    category: a.belongsTo('Category', 'categoryId'),
    subCategoryId: a.id(),
    subCategroies: a.belongsTo('SubCategory', 'subCategoryId'),
    userSelectedCourses: a.hasMany('UserSelectedCourse', 'courseId'),
  })
  .authorization(allow => [allow.guest()]),

  Student: a.model({
    id: a.id().required(),
    firstName: a.string(),
    lastName: a.string(),
    universityId: a.id(),
    university: a.belongsTo('University', 'universityId'),
    majorId: a.id(),
    major: a.belongsTo('Major', 'majorId'),
  })
  .authorization(allow => [allow.owner()]),

  MajorUniversity: a.model({
    majorId: a.id().required(),
    universityId: a.id().required(),
    major: a.belongsTo('Major', 'majorId'),
    university: a.belongsTo('University', 'universityId'),
  })
  .authorization(allow => [allow.guest()]),

  UserSelectedCourse: a.model({
    id: a.id().required(),
    userId: a.id(),
    completed: a.boolean(),
    courseId: a.id(),
    course: a.belongsTo('Course', 'courseId'),
  })
  .authorization(allow => [allow.owner()]),

  /*
  likePost: a
    .mutation()
    .arguments({ postId: a.id() })
    .returns(a.ref('Post'))
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.custom({
      dataSource: a.ref('Post'),
      entry: './increment-like.js'
    }))
  */

  // Mutations
  // 2. Define your mutation with the return type and, optionally, arguments
  bulkCreateStates: a.mutation()
    .arguments({
      states: a.array(
        a.object({
          id: a.id().required(),
          name: a.enum(['CO', 'CT', 'NY']),
          displayName: a.string(),
        })
      ).required()
    })
    .returns(
      a.object({
        successCount: a.integer(),
        failedCount: a.integer(),
        failedItems: a.array(
          a.object({
            index: a.integer(),
            code: a.string(),
            error: a.string()
          })
        )
      })
    )
    .authorization((allow) => [
      // This would typically be restricted to admins
      allow.guest() // For demonstration purposes
    ]),
    // .handler: async (event) => {
    //   const { arguments: args } = event;
    //   const states = args.courses;
      
    //   const results = {
    //     successCount: 0,
    //     failedCount: 0,
    //     failedItems: []
    //   };
      
    //   // Process courses in states of 25 (DynamoDB limitation)
    //   for (let i = 0; i < states.length; i += 25) {
    //     const batch = states.slice(i, i + 25);
        
    //     // Process each course in the current batch
    //     const batchPromises = batch.map(async (state, batchIndex) => {
    //       const index = i + batchIndex;
          
    //       try {              
    //         // Create the course
    //         await ctx.data.State.create({
    //           id: state.id,
    //           name: state.name,
    //           displayName: state.displayName,
    //         });
            
    //         results.successCount++;
    //       } catch (error: unknown) {
    //         results.failedCount++;
    //         results.failedItems.push({
    //           // index,
    //           // code: state.id,
    //           error: error.message
    //         });
    //       }
    //     });
        
    //     // Wait for all operations in this batch to complete
    //     await Promise.all(batchPromises);
    //   }
      
    //   return results;
    // }),

    /*
    bulkCreateStates: (ctx) => ({
      resolver: a.mutation()
        .arguments({
          courses: a.array(
            a.object({
              id: a.id().required(),
              name: a.enum(['CO', 'CT', 'NY']),
              displayName: a.string(),
            })
          ).required()
        })
        .returns(
          a.object({
            successCount: a.integer(),
            failedCount: a.integer(),
            failedItems: a.array(
              a.object({
                index: a.integer(),
                code: a.string(),
                error: a.string()
              })
            )
          })
        )
        
      handler: async (event) => {
        const { arguments: args } = event;
        const states = args.courses;
        
        const results = {
          successCount: 0,
          failedCount: 0,
          failedItems: []
        };
        
        // Process courses in states of 25 (DynamoDB limitation)
        for (let i = 0; i < states.length; i += 25) {
          const batch = states.slice(i, i + 25);
          
          // Process each course in the current batch
          const batchPromises = batch.map(async (state, batchIndex) => {
            const index = i + batchIndex;
            
            try {              
              // Create the course
              await ctx.data.State.create({
                id: state.id,
                name: state.name,
                displayName: state.displayName,
              });
              
              results.successCount++;
            } catch (error: unknown) {
              results.failedCount++;
              results.failedItems.push({
                // index,
                // code: state.id,
                error: error.message
              });
            }
          });
          
          // Wait for all operations in this batch to complete
          await Promise.all(batchPromises);
        }
        
        return results;
      }
    })
    .authorization((allow) => [
      // This would typically be restricted to admins
      allow.guest() // For demonstration purposes
    ]),
    */
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // defaultAuthorizationMode: "apiKey",
    // // API Key is used for a.allow.public() rules
    // apiKeyAuthorizationMode: {
    //   expiresInDays: 30,
    // },
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
