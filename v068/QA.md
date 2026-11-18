# Chess Doctor v0.6.8 Beta — QA

Automated checks cover:
- v068 in regression matrix;
- Doctor shows target highlight before motion;
- Doctor shows role-colored direction arrow;
- arrow remains after the move;
- stronger move uses green arrow;
- deterministic capture shows capture warning and fade;
- Master Lesson move demo shows target highlight and arrow;
- Master demo finishes on correct destination;
- all earlier versions remain green.

Manual iPhone checks:
1. Tap “Показать на доске”.
2. On a move step, confirm you can identify source and target before the piece moves.
3. Follow the arrow, then the piece.
4. On a capture, confirm the victim is visually obvious before disappearing.
5. After the move, confirm the arrow stays long enough to reconstruct the path.
6. Compare blue “ТВОЙ ХОД” and green “СИЛЬНЫЙ ХОД”.
