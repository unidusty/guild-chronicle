import type { Race, Gender } from "../../types/game";
import { pick } from "./util";

const namePool = {
  human: {
    male: ["Aldric", "Bryn", "Corvin", "Daven", "Erik", "Fenwick", "Gareth", "Halren", "Isen", "Jovyn",
           "Kael", "Lorn", "Maren", "Neven", "Oswin", "Pell", "Rolf", "Sever", "Thane", "Uwen"],
    female: ["Aelith", "Brynn", "Calla", "Dara", "Elara", "Faye", "Gwen", "Hana", "Iriel", "Jana",
             "Kira", "Lyra", "Mira", "Nara", "Orla", "Petra", "Rhea", "Sona", "Tara", "Vela"],
    surname: ["Ashford", "Coldwater", "Dunmore", "Eastmere", "Farrow", "Goldstone", "Greymoor", "Ironwood", "Thornwall", "Vinter"],
  },
  elf: {
    male: ["Aelion", "Caelith", "Daeven", "Elarien", "Faeryn", "Galewin", "Haelion", "Ilaren", "Kaelith", "Laerion",
           "Maewin", "Naelith", "Olaeren", "Paelith", "Raeven", "Saelion", "Taelith", "Ulaerin", "Vaelion", "Waelith"],
    female: ["Aelara", "Caevyn", "Daevara", "Elaira", "Faeryn", "Galewynn", "Haelara", "Ilaria", "Kaelara", "Laeira",
             "Maelara", "Naelith", "Olaevyn", "Paelara", "Raevyn", "Saelara", "Taelith", "Ulaevyn", "Vaelara", "Waelith"],
    surname: ["Arvel", "Dawnleaf", "Evenstar", "Farwind", "Glorybrook", "Halfmoon", "Jadeleaf", "Kindlestar", "Leafwhisper", "Moonveil"],
  },
  dwarf: {
    male: ["Bofur", "Dain", "Gimrak", "Horgrak", "Karduk", "Magni", "Norgrak", "Orgrim", "Thorak", "Urgrak",
           "Wulfgar", "Brundar", "Caedrak", "Durgin", "Embrak"],
    female: ["Brynn", "Dagna", "Frigga", "Hilda", "Ingrid", "Kista", "Marta", "Norra", "Sigrda", "Thora",
             "Ulfhild", "Birna", "Caera", "Dagni", "Erda"],
    surname: ["Goldpick", "Hammerfall", "Ironshield", "Rockmantle", "Silveranvil", "Steelbrow", "Stonefist", "Strongback", "맥주먹", "Warhammer"],
  },
} as const;

export function generateName(race: Race, gender: Gender): string {
  const pool = namePool[race];
  const first = pick(gender === "male" ? pool.male : pool.female);
  const last = pick(pool.surname);
  return `${first} ${last}`;
}
