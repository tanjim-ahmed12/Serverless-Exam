import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    const cinemaId = event.pathParameters?.cinemaId;
    const movieId = event.queryStringParameters?.movieId;

    if (!cinemaId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "cinemaId is required in path" }),
      };
    }

    const params: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "cinemaId = :cid",
      ExpressionAttributeValues: {
        ":cid": Number(cinemaId),
      },
    };

    if (movieId) {
      params.KeyConditionExpression += " AND movieId = :mid";
      params.ExpressionAttributeValues![':mid'] = movieId;
    }

    const result = await client.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: result.Items }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
