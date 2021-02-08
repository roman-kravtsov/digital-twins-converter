const fs = require("fs");
const DigitalTwinsConverter = require("./DigitalTwinsConverter");
const utils = require("./utils");

/**
 * Convert a Digital Twins Model to a Thing Model
 *
 */
function convert() {
  const { fileName: digitalTwinsModelPath } = utils.getConsoleArguments();

  const digitalTwinsModel = utils.getDataFromFile(digitalTwinsModelPath);

  const digitalTwinsConverter = new DigitalTwinsConverter(digitalTwinsModel);
  const thingModel = digitalTwinsConverter.convert();
  const thingModelJSON = JSON.stringify(thingModel, null, "\t");
  fs.writeFileSync("./generated-thing-model.json", thingModelJSON);
}

convert();
