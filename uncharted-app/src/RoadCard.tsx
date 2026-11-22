// A stop drawn as its full widget on its stretch of road, answerable in place (no pin to open first).
import { memo } from "react";
import { View } from "react-native";

import { AnswerPayload } from "./api";
import { Segment } from "./contract";
import { Paving, Widget } from "./widgets";

export type CardActions = {
  answer: (seg: Segment, p: AnswerPayload) => void;
  change: (seg: Segment) => void;
  retry: (seg: Segment) => void;
  home: () => void;
};

// Memoized on the segment and its state, so scrolling (which re-renders the road every frame) does not re-render widgets.
export const CardBody = memo(
  function CardBody({ seg, rulesNow, actions }: { seg: Segment; rulesNow: string; actions: React.RefObject<CardActions> }) {
    return (
      <View testID={`card-${seg.el.type}`}>
        <Widget seg={seg} rulesNow={rulesNow ? rulesNow.split("\n") : []}
          answer={(p) => actions.current.answer(seg, p)} change={() => actions.current.change(seg)} retry={() => actions.current.retry(seg)}
          onGoal={() => actions.current.home()} onExplore={() => actions.current.home()} />
      </View>
    );
  },
  (a, b) => a.seg.id === b.seg.id && a.rulesNow === b.rulesNow && JSON.stringify(a.seg.answer) === JSON.stringify(b.seg.answer) && JSON.stringify(a.seg.el) === JSON.stringify(b.seg.el),
);

export const PavingCard = memo(function PavingCard() {
  return (
    <View style={{ opacity: 0.9 }}>
      <Paving />
    </View>
  );
});
