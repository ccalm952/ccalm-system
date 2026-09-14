import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export function ToothBrandCombobox({
  brands,
  value,
  onValueChange,
}: {
  brands: string[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Combobox items={brands} value={value || null} onValueChange={(v) => onValueChange(v ?? "")}>
      <ComboboxInput placeholder="品牌" />
      <ComboboxContent>
        <ComboboxEmpty>库存中暂无品牌</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function ToothModelCombobox({
  models,
  brand,
  value,
  onValueChange,
}: {
  models: string[];
  brand: string;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const disabled = !brand.trim();
  return (
    <Combobox
      items={models}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
    >
      <ComboboxInput placeholder={disabled ? "请先选择品牌" : "植体"} disabled={disabled} />
      <ComboboxContent>
        <ComboboxEmpty>该品牌暂无库存型号</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
