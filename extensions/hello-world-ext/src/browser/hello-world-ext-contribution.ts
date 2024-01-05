import { injectable, inject } from "@theia/core/shared/inversify";
import {
  Command,
  CommandContribution,
  CommandRegistry,
  MenuContribution,
  MenuModelRegistry,
  MessageService,
} from "@theia/core/lib/common";
import { CommonMenus } from "@theia/core/lib/browser";

export const HelloWorldExtCommand: Command = {
  id: "HelloWorldExt.command",
  label: "Say Hello",
};

@injectable()
export class HelloWorldExtCommandContribution implements CommandContribution {
  constructor(
    @inject(MessageService) private readonly messageService: MessageService,
  ) {}

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(HelloWorldExtCommand, {
      execute: () => this.messageService.info("Hello World!"),
    });
  }
}

@injectable()
export class HelloWorldExtMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(CommonMenus.EDIT_FIND, {
      commandId: HelloWorldExtCommand.id,
      label: HelloWorldExtCommand.label,
    });
  }
}
