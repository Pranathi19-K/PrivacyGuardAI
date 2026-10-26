import { Router, type IRouter } from "express";
import {
  CreateRuleBody,
  CreateRuleResponse,
  DeleteRuleParams,
  DeleteRuleResponse,
  ListRulesResponse,
} from "@workspace/api-zod";
import { userIdFrom } from "../middlewares/auth";
import { recordAudit } from "../lib/audit";
import { DetectionRuleModel } from "../lib/models";
import { detectSensitiveData, validateSafePattern } from "../lib/scan-engine";

const router: IRouter = Router();

router.get("/rules", async (_req, res): Promise<void> => {
  const ownerId = userIdFrom(res);
  const rules = await DetectionRuleModel.find({ ownerId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(
    ListRulesResponse.parse(
      rules.map((rule) => ({
        id: rule._id.toString(),
        label: rule.label,
        pattern: rule.pattern,
        maskWith: rule.maskWith,
        enabled: rule.enabled,
        createdAt: rule.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/rules", async (req, res): Promise<void> => {
  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a rule name, supported pattern, and replacement." });
    return;
  }

  const label = parsed.data.label.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const pattern = parsed.data.pattern.trim();
  const maskWith = parsed.data.maskWith.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!label || !pattern || !maskWith) {
    res.status(400).json({ error: "Rule name, pattern, and replacement cannot be blank." });
    return;
  }
  const patternError = validateSafePattern(pattern);
  if (patternError) {
    res.status(400).json({ error: patternError });
    return;
  }
  if (detectSensitiveData(maskWith).length > 0) {
    res.status(400).json({ error: "The replacement must not contain a detectable email, phone, or identification number." });
    return;
  }

  const ownerId = userIdFrom(res);
  const existingCount = await DetectionRuleModel.countDocuments({ ownerId });
  if (existingCount >= 25) {
    res.status(409).json({ error: "You can save up to 25 custom rules." });
    return;
  }
  const rule = await DetectionRuleModel.create({
    ownerId,
    label,
    pattern,
    maskWith,
    enabled: true,
  });
  await recordAudit(ownerId, "rule_created", "Added a custom detection rule.");
  res.status(201).json(
    CreateRuleResponse.parse({
      id: rule._id.toString(),
      label: rule.label,
      pattern: rule.pattern,
      maskWith: rule.maskWith,
      enabled: rule.enabled,
      createdAt: rule.createdAt.toISOString(),
    }),
  );
});

router.delete("/rules/:ruleId", async (req, res): Promise<void> => {
  const params = DeleteRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid rule identifier." });
    return;
  }
  const ownerId = userIdFrom(res);
  const deleted = await DetectionRuleModel.findOneAndDelete({
    _id: params.data.ruleId,
    ownerId,
  });
  if (!deleted) {
    res.status(404).json({ error: "Detection rule not found." });
    return;
  }
  await recordAudit(ownerId, "rule_deleted", "Deleted a custom detection rule.");
  res.status(204).json(DeleteRuleResponse.parse(undefined));
});

export default router;
