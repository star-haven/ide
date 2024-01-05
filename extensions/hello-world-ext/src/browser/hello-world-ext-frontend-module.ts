/**
 * Generated using theia-extension-generator
 */
import {
  HelloWorldExtCommandContribution,
  HelloWorldExtMenuContribution,
} from "./hello-world-ext-contribution";
import { CommandContribution, MenuContribution } from "@theia/core/lib/common";
import { ContainerModule } from "@theia/core/shared/inversify";

export default new ContainerModule((bind) => {
  // add your contribution bindings here
  bind(CommandContribution).to(HelloWorldExtCommandContribution);
  bind(MenuContribution).to(HelloWorldExtMenuContribution);
});
