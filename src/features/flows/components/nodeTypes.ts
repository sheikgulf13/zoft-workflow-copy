import {
  TriggerNode,
  ActionNode,
  ConditionNode,
  DelayNode,
  RouterNode,
  EndNode,
  RouterBranchNode,
  LoopNode,
  CodeNode,
} from "./CustomNodes";

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  router: RouterNode,
  loop: LoopNode,
  routerBranch: RouterBranchNode,
  code: CodeNode,
  end: EndNode,
};
