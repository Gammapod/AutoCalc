import { defaultContentProvider } from "../../src/content/defaultContentProvider.js";
import { setAppServices } from "../../src/contracts/appServices.js";
import { setContentProvider } from "../../src/contracts/contentRegistry.js";

setAppServices({ contentProvider: defaultContentProvider });
setContentProvider(defaultContentProvider);

