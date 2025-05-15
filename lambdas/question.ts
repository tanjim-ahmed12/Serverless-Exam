import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const cinemaId = event.pathParameters?.cinemaId;
    const movieId = event.queryStringParameters?.movieId;
    const period = event.queryStringParameters?.period;

    if (!cinemaId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "cinemaId path parameter is required" }),
      };
    }

    const parsedCinemaId = parseInt(cinemaId);
    if (isNaN(parsedCinemaId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "cinemaId must be a number" }),
      };
    }

    let params: QueryCommandInput;

    if (movieId) {
      // Query cinemaId + movieId
      params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "cinemaId = :cid AND movieId = :mid",
        ExpressionAttributeValues: {
          ":cid": parsedCinemaId,
          ":mid": movieId,
        },
      };
    } else if (period) {
      // Query using LSI: cinemaId + period
      params = {
        TableName: process.env.TABLE_NAME,
        IndexName: "periodIx",
        KeyConditionExpression: "cinemaId = :cid AND period = :period",
        ExpressionAttributeValues: {
          ":cid": parsedCinemaId,
          ":period": period,
        },
      };
    } else {
      // Return all movies for the cinemaId
      params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "cinemaId = :cid",
        ExpressionAttributeValues: {
          ":cid": parsedCinemaId,
        },
      };
    }

    const result = await client.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: result.Items }),
    };
  } catch (error: any) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
};

function createDdbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}
