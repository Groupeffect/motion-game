import { Model } from 'pinia-orm'

/* eslint-disable */
export default class GameData extends Model {
  static entity = 'gamedatas'

  static fields () {
    return {
      id: this.uid(),
      hp: this.attr(),
      running: this.attr(),
      startTime: this.attr(),
      baseX: this.attr(),
      baseY: this.attr(),
      survivalTime: this.attr(),
      feedbackIntensity: this.attr(),
      hpColorClass: this.attr()
    }
  }
}
