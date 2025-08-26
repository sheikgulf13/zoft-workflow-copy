import { TriggerNode, ActionNode, ConditionNode, DelayNode, EndNode } from './CustomNodes';

// Node type mapping
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  end: EndNode,
};
