import { PERMISSIONS } from "../access/access-policy";
import { PERMISSIONS_KEY } from "../auth/auth.guards";
import { StructureController } from "./structure.controller";

describe("StructureController permissions", () => {
  const metadataFor = (method: keyof StructureController) => {
    const handler = Object.getOwnPropertyDescriptor(
      StructureController.prototype,
      method,
    )?.value as (...args: unknown[]) => unknown;
    return Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[];
  };

  it.each([
    ["signerLists", PERMISSIONS.signerListsManage],
    ["sendLists", PERMISSIONS.sendListsManage],
    ["serviceCharters", PERMISSIONS.serviceChartersManage],
    ["serviceCharterTree", PERMISSIONS.serviceChartersManage],
    ["createServiceCharter", PERMISSIONS.serviceChartersManage],
    ["updateServiceCharter", PERMISSIONS.serviceChartersManage],
    ["removeServiceCharter", PERMISSIONS.serviceChartersManage],
    ["uploadServiceCharterIcon", PERMISSIONS.serviceChartersManage],
    ["serviceCharterIcon", PERMISSIONS.serviceChartersManage],
    ["documentRoles", PERMISSIONS.documentRolesManage],
  ] as const)("%s exige a permissão administrativa explícita", (method, key) => {
    expect(metadataFor(method)).toEqual([key]);
  });

  it("mantém pessoas sob leitura estrutural autenticada", () => {
    expect(metadataFor("persons")).toEqual([PERMISSIONS.structureRead]);
    expect(metadataFor("personLists")).toEqual([PERMISSIONS.structureRead]);
  });
});
