// User Model

import { Model } from 'pinia-orm'

export default class Interface extends Model {
  // entity is a required property for all models.
  static entity = 'interfaces'

  // List of all fields (schema) of the post model. `this.string()` declares
  // a string field type with a default value as the first argument.
  // `this.uid()` declares a unique id if none provided.
  static fields () {
    return {
      id: this.uid(),
      name: this.string(''),
      key: this.string(''),
      value: this.attr(null)
    }
  }
}
