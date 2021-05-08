const Converter = require("./Converter");
const _ = require("lodash");
/**
 * A DigitalTwins Model
 * @typedef {Object} DigitalTwinsModel
 */

/**
 * A Converter from DigitalTwins to Thing Model
 * @class DigitalTwinsConverter
 * @extends {Converter}
 */
class DigitalTwinsConverter extends Converter {
  constructor(digitalTwinsModel) {
    super({
      properties: {},
      actions: {},
      events: {},
    });
    this.digitalTwinsModel = digitalTwinsModel;
    this.typeDictionary = {
      boolean: "boolean",
      double: "number",
      date: "date",
      duration: "string",
      float: "number",
      integer: "integer",
      long: "integer",
      string: "string",
      dateTime: "string",
    };
  }

  /**
   * Match a Digital Twins data schema to a type supported in Thing Model
   * https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#schemas
   *
   * @param {Object|String} schema
   * @returns {Object}
   * @memberof DigitalTwinsConverter
   */
  __dataMapper(schema) {
    if (typeof schema === "string") {
      return { type: this.typeDictionary[schema] };
    }
    if (typeof schema === "object") {
      if (schema["@type"] === "Object") {
        return {
          type: "object",
          properties: schema.fields.reduce((properties, property) => {
            properties[property.name] = {
              name: property.name,
              type: this.typeDictionary[property.schema],
            };
            return properties;
          }, {}),
        };
      }
    }
  }

  /**
   * Get the mapper for the given content type
   *
   * @param {Array|String} contentItem
   * @returns
   * @memberof DigitalTwinsConverter
   */
  __getContentMapper(contentItem) {
    const type = Array.isArray(contentItem["@type"])
      ? contentItem["@type"][0]
      : contentItem["@type"];
    switch (type) {
      case "Telemetry":
        return this.__telemetryMapper.bind(this);
      case "Property":
        return this.__propertyMapper.bind(this);
      case "Command":
        return this.__commandMapper.bind(this);
      default:
        throw { error: true, message: "This type of content is not supported" };
    }
  }

  /**
   * Map the Telemetry type to the Events type in Thing Model
   * https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#telemetry
   *
   * @param {Object} data
   * @returns
   * @memberof DigitalTwinsConverter
   */
  __telemetryMapper(data) {
    return {
      targetKey: "events",
      name: data.name,
      data: {
        description: data.description,
        data: { type: this.typeDictionary[data.schema] },
      },
    };
  }

  /**
   * Map the Property type to the Properties type in Thing Model
   * https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#property
   *
   * @param {Object} data
   * @returns
   * @memberof DigitalTwinsConverter
   */
  __propertyMapper(data) {
    return {
      targetKey: "properties",
      name: data.name,
      data: {
        description: data.description,
        type: this.typeDictionary[data.schema],
        writable: data.writable,
      },
    };
  }

  /**
   * Map the Command type to the Actions type in Thing Model
   * https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#command
   *
   * @param {Object} data
   * @returns
   * @memberof DigitalTwinsConverter
   */
  __commandMapper(data) {
    return {
      targetKey: "actions",
      name: data.name,
      data: {
        description: data.description,
        input: data.request
          ? {
              ...this.__dataMapper(data.request.schema),
              name: data.request.name,
            }
          : undefined,
        output: data.response
          ? {
              ...this.__dataMapper(data.response.schema),
              name: data.request.name,
            }
          : undefined,
        writable: data.writable,
      },
    };
  }

  /**
   * Convert Digital Twin Model to a Thing Model
   * @returns {Object} Thing Model
   */
  convert() {
    const now = new Date(Date.now());
    this.targetModel["@type"] = "ThingModel";
    this.targetModel["@context"] = ["https://www.w3.org/2019/wot/td/v1"];
    this.targetModel.description = this.digitalTwinsModel.description;
    this.targetModel.title = this.digitalTwinsModel.displayName;
    this.targetModel.created = now;
    this.targetModel.modified = now;
    for (const contentIitem of this.digitalTwinsModel.contents) {
      const mapper = this.__getContentMapper(contentIitem);
      const mappedData = mapper(contentIitem);
      this.targetModel[mappedData.targetKey] = {
        ...this.targetModel[mappedData.targetKey],
        [mappedData.name]: { name: mappedData.name, ...mappedData.data },
      };
    }
    return this.targetModel;
  }
}
module.exports = DigitalTwinsConverter;
