// A stop drawn as its full widget on its stretch of road, answerable in place (no pin to open first).
import { memo } from "react";
import Animated, { Easing, Keyframe, LinearTransition } from "react-native-reanimated";

import { AnswerPayload } from "./api";
import { Segment } from "./contract";
import { MessageCtx } from "./hw";
import { Paving, Widget } from "./widgets";

// Cards arrive diagonally from the bottom right of the screen.
export const FROM_BOTTOM_RIGHT = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 140 }, { translateY: 120 }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(460);

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
      <Animated.View entering={FROM_BOTTOM_RIGHT} layout={LinearTransition.duration(220)} testID={`card-${seg.el.type}`}>
        {/* Offline fallback messages are dev detail; agent and fixed messages are part of the stop. */}
        <MessageCtx.Provider value={seg.source === "fallback" ? undefined : seg.message}>
          <Widget seg={seg} rulesNow={rulesNow ? rulesNow.split("\n") : []}
            answer={(p) => actions.current.answer(seg, p)} change={() => actions.current.change(seg)} retry={() => actions.current.retry(seg)}
            onGoal={() => actions.current.home()} onExplore={() => actions.current.home()} />
        </MessageCtx.Provider>
      </Animated.View>
    );
  },
  (a, b) => a.seg.id === b.seg.id && a.rulesNow === b.rulesNow && JSON.stringify(a.seg.answer) === JSON.stringify(b.seg.answer) && JSON.stringify(a.seg.el) === JSON.stringify(b.seg.el),
);

export const PavingCard = memo(function PavingCard() {
  return (
    <Animated.View entering={FROM_BOTTOM_RIGHT} style={{ opacity: 0.9 }}>
      <Paving />
    </Animated.View>
  );
});
