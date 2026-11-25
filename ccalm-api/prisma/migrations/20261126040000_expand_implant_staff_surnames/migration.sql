-- 种植配台旧数据用姓（卢/许/陈/王），人员更新后改为全名。
-- 只替换「独立姓」token，已是全名的（如卢彤）不会被改。

CREATE OR REPLACE FUNCTION _ccalm_expand_assist_staff(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN raw;
  END IF;
  -- 统一分隔符
  s := regexp_replace(btrim(raw), '[、,+/\s]+', '，', 'g');
  -- 独立姓 → 全名（前后为分隔或边界）
  s := regexp_replace(s, '(^|，)卢(，|$)', E'\\1卢彤\\2', 'g');
  s := regexp_replace(s, '(^|，)许(，|$)', E'\\1许桦婧\\2', 'g');
  s := regexp_replace(s, '(^|，)陈(，|$)', E'\\1陈美珍\\2', 'g');
  s := regexp_replace(s, '(^|，)王(，|$)', E'\\1王忆淳\\2', 'g');
  RETURN s;
END;
$$;

UPDATE "ImplantVisit"
SET staff = _ccalm_expand_assist_staff(staff),
    "updatedAt" = NOW()
WHERE staff IS NOT NULL
  AND staff <> ''
  AND staff IS DISTINCT FROM _ccalm_expand_assist_staff(staff);

UPDATE "MedicalRecord"
SET nurse = _ccalm_expand_assist_staff(nurse),
    "updatedAt" = NOW()
WHERE nurse <> ''
  AND nurse IS DISTINCT FROM _ccalm_expand_assist_staff(nurse);

DROP FUNCTION _ccalm_expand_assist_staff(text);
