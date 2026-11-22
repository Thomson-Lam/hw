// Last stop on a money road: name the step, show how to do it, then mark it done or defer.
// Not a bank confirmation — this screen does not move money.
// Hierarchy: action headline → plain sim note → numbered how-to → primary done / defer → edge case.
import { useContext, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AnswerPayload } from "./api";
import { Element, Segment } from "./contract";
import { C, F, PicksCtx, T, Window } from "./hw";

type Of<K extends Element["type"]> = Extract<Element, { type: K }>;
const pct = (n: number, total: number) => Math.round((100 * n) / total);

function Why({ e, onChangeAmount }: { e: Of<"action">; onChangeAmount?: () => void }) {
  const p = e.payoff;
  const was = p ? pct(p.before, p.total) : null;
  const now = p ? pct(p.after, p.total) : null;
  const sub = p && was != null && now != null
    ? `From your plan. In our simulations, this raised the share who ${p.what} from ${was}% to ${now}%.`
    : "From the plan you just made.";
  return (
    <View style={{ gap: 8 }}>
      <Text style={T.h} testID="action-payoff">
        Set up a ${e.weekly} weekly auto-transfer
      </Text>
      <Text style={T.p} accessibilityLabel={p ? `${sub} Based on ${p.total.toLocaleString("en-CA")} simulated runs.` : sub}>
        {sub}
      </Text>
      {onChangeAmount ? (
        <Pressable
          onPress={onChangeAmount}
          accessibilityRole="button"
          testID="action-change-amount"
          hitSlop={8}
          style={{ alignSelf: "flex-start", paddingVertical: 4 }}
        >
          <Text style={[T.link, { paddingVertical: 0 }]}>Change amount</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function How({ weekly }: { weekly: number }) {
  const steps = [
    "Open your bank app",
    `Start a recurring transfer for $${weekly} every week`,
    "Send it from chequing to a savings account",
    "Set it to start the day after payday",
  ];
  return (
    <View style={{ gap: 12 }} testID="action-steps">
      <Text style={T.k}>How to do it</Text>
      <View style={{ gap: 10 }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.sel, width: 20 }}>{i + 1}.</Text>
            <Text style={[T.p, { flex: 1, color: C.ink }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Help() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="action-why"
        hitSlop={8}
        style={{ alignSelf: "flex-start", paddingVertical: 4 }}
      >
        <Text style={[T.link, { paddingVertical: 0 }]}>{open ? "Hide" : "No savings account yet?"}</Text>
      </Pressable>
      {open ? (
        <Text style={T.p}>
          Open a high-interest savings account in the same app first. A tax-free savings account (TFSA) works too — money can come out any time, tax-free.
        </Text>
      ) : null}
    </View>
  );
}

function Act({ seg, answer, change }: { seg: Segment; answer: (p: AnswerPayload) => void; change: () => void }) {
  const picked = seg.answer?.label;
  if (picked) {
    const done = picked === "set up" || picked === "done";
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink, flexShrink: 1 }}>
          {done ? "✓ Marked as set up" : picked === "remind" || picked.includes("remind") ? "✓ Reminder set for after payday" : `✓ ${picked}`}
        </Text>
        <Pressable onPress={change} accessibilityRole="button" testID={`change-${seg.id}`} hitSlop={8} style={{ paddingVertical: 8 }}>
          <Text style={[T.link, { paddingVertical: 0 }]}>Change</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={() => answer({ verdict: "done" })}
        accessibilityRole="button"
        testID="action-done"
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 999,
          backgroundColor: C.sel,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: "#fff" }}>I’ve set it up</Text>
      </Pressable>
      <Pressable
        onPress={() => answer({ verdict: "remind" })}
        accessibilityRole="button"
        testID="remind"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        style={({ pressed }) => ({ alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 20, color: C.sub }}>Remind me after payday</Text>
      </Pressable>
    </View>
  );
}

export function Action({ seg, answer, change }: { seg: Segment; answer: (p: AnswerPayload) => void; change: () => void }) {
  const e = seg.el as Of<"action">;
  const { picks, jump } = useContext(PicksCtx);
  const amountPick = picks.find((p) => p.label.includes(`$${e.weekly}`) && /week/i.test(p.label))
    ?? picks.find((p) => /a week set aside|week buffer/i.test(p.label));
  return (
    <Window title="One next step">
      <View style={{ gap: 16 }}>
        <Why e={e} onChangeAmount={amountPick ? () => jump(amountPick.id) : undefined} />
        <How weekly={e.weekly} />
        <View style={{ gap: 8 }}>
          <Act seg={seg} answer={answer} change={change} />
          <Help />
        </View>
      </View>
    </Window>
  );
}
