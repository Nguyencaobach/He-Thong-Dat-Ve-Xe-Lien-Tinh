const winston = require('winston');

const createLogger = (serviceName) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            info => `${info.timestamp} [${info.service}] ${info.level}: ${info.message} ${info.stack ? '\n' + info.stack : ''}`
          )
        )
      })
    ]
  });
};

module.exports = createLogger;
