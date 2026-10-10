import { Model } from 'pinia-orm'

/* eslint-disable */
export default class GameData extends Model {
  static entity = 'gamedatas'

  static fields () {
    return {
      id: this.attr('session'),
      hp: this.number(100),
      running: this.boolean(false),
      startTime: this.number(0),
      baseX: this.number(0),
      baseY: this.number(0),
      survivalTime: this.string('0'),
      feedbackIntensity: this.number(0),
      hpColorClass: this.string('green')
    }
  }
}
