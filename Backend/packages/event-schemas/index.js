const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv();
addFormats(ajv); // Để hỗ trợ kiểm tra định dạng ngày tháng (date-time)

const searchEventSchema = require("./searchEvent.json");
const bookingPaidEventSchema = require("./bookingPaidEvent.json");

ajv.addSchema(searchEventSchema, "searchEvent");
ajv.addSchema(bookingPaidEventSchema, "bookingPaidEvent");

const validateEvent = (eventName, data) => {
  const validate = ajv.getSchema(eventName);
  if (!validate) throw new Error(`Schema ${eventName} không tồn tại`);
  
  const valid = validate(data);
  if (!valid) {
    throw new Error(`Dữ liệu sự kiện không hợp lệ: ${ajv.errorsText(validate.errors)}`);
  }
  return true;
};

module.exports = {
  validateEvent,
  schemas: {
    searchEventSchema,
    bookingPaidEventSchema
  }
};
