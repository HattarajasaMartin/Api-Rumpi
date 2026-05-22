import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Threads Clone API',
            version: '1.0.0',
            description: `
`,
        },
        servers: [
            {
                url: process.env.BASE_URL,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/docs/**/*.yaml'],
};

export const swaggerSpec = swaggerJSDoc(options);