import { assessAi } from "./ai";
import { assessEducation } from "./education";
import { assessSocial } from "./social";
import { assessMedia } from "./media";
import { assessUrban } from "./urban";
import { assessClimate } from "./climate";
import { assessInfrastructure } from "./infrastructure";
import { assessQuantum } from "./quantum";
export const PMD_ASSESSORS = {
  ai: assessAi,
  education: assessEducation,
  social: assessSocial,
  media: assessMedia,
  urban: assessUrban,
  climate: assessClimate,
  infrastructure: assessInfrastructure,
  quantum: assessQuantum,
};
