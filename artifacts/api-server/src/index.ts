import app from "./app";
import { logger } from "./lib/logger";
import { connectMongo } from "./lib/mongo";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer(): Promise<void> {
  try {
    await connectMongo();
    app.listen(port, (err) => {
      if (err) {
        logger.error({ errorName: err.name }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "API server startup failed",
    );
    process.exit(1);
  }
}

void startServer();
