import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// A bottom-sheet option picker that adds a search box when the list is long,
/// so choosing from many options (cities, truck types, …) is quick. Returns the
/// picked value, or null if dismissed.
///
/// Search appears automatically when there are more than [searchThreshold]
/// options; it matches the label and subtitle (case-insensitive substring).
Future<T?> nqPickOption<T>(
  BuildContext context, {
  required String title,
  required List<T> options,
  required String Function(T) label,
  String Function(T)? subtitle,
  String searchHint = 'ابحث…',
  int searchThreshold = 7,
}) {
  final c = context.nq;
  return showModalBottomSheet<T>(
    context: context,
    backgroundColor: c.sf,
    showDragHandle: true,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _OptionSheet<T>(
      title: title,
      options: options,
      label: label,
      subtitle: subtitle,
      searchHint: searchHint,
      searchThreshold: searchThreshold,
    ),
  );
}

class _OptionSheet<T> extends StatefulWidget {
  const _OptionSheet({
    required this.title,
    required this.options,
    required this.label,
    required this.subtitle,
    required this.searchHint,
    required this.searchThreshold,
  });

  final String title;
  final List<T> options;
  final String Function(T) label;
  final String Function(T)? subtitle;
  final String searchHint;
  final int searchThreshold;

  @override
  State<_OptionSheet<T>> createState() => _OptionSheetState<T>();
}

class _OptionSheetState<T> extends State<_OptionSheet<T>> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<T> get _filtered {
    final q = _query.trim();
    if (q.isEmpty) return widget.options;
    return widget.options.where((o) {
      final hay = '${widget.label(o)} ${widget.subtitle?.call(o) ?? ''}';
      return hay.toLowerCase().contains(q.toLowerCase());
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final showSearch = widget.options.length > widget.searchThreshold;
    final items = _filtered;
    // Cap the sheet height so it doesn't cover the whole screen; leave room for
    // the keyboard when searching.
    final maxH = MediaQuery.of(context).size.height * 0.75;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxH),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Text(widget.title,
                    style: NqType.h3.copyWith(color: c.tx),
                    textAlign: TextAlign.center),
              ),
              if (showSearch)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Container(
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: c.bg,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                      border: Border.all(color: c.bd),
                    ),
                    child: Row(
                      children: [
                        NqIcon(NqIcons.magnifyingGlass, size: 18, color: c.tx3),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _search,
                            autofocus: false,
                            onChanged: (v) => setState(() => _query = v),
                            textAlign: TextAlign.right,
                            style: NqType.body.copyWith(color: c.tx),
                            cursorColor: c.mintS,
                            decoration: InputDecoration(
                              isCollapsed: true,
                              border: InputBorder.none,
                              hintText: widget.searchHint,
                              hintStyle: NqType.body.copyWith(color: c.tx3),
                            ),
                          ),
                        ),
                        if (_query.isNotEmpty)
                          GestureDetector(
                            onTap: () => setState(() {
                              _search.clear();
                              _query = '';
                            }),
                            child: NqIcon(NqIcons.x, size: 16, color: c.tx3),
                          ),
                      ],
                    ),
                  ),
                ),
              Flexible(
                child: items.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Text('لا نتائج مطابقة',
                            style: NqType.body.copyWith(color: c.tx3)),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final o = items[i];
                          final sub = widget.subtitle?.call(o);
                          return ListTile(
                            title: Text(widget.label(o),
                                style: NqType.body.copyWith(color: c.tx),
                                textAlign: TextAlign.right),
                            subtitle: sub == null
                                ? null
                                : Text(sub,
                                    style: NqType.caption.copyWith(color: c.tx3),
                                    textAlign: TextAlign.right),
                            onTap: () => Navigator.of(context).pop(o),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
