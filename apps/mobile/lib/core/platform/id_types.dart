/// Identity-document types for drivers and individual (sole-operator) carriers.
/// Values match the backend enum (NATIONAL_ID | IQAMA | PASSPORT).
class IdTypeOption {
  const IdTypeOption(this.value, this.label);
  final String value;
  final String label;
}

const List<IdTypeOption> kIdTypes = [
  IdTypeOption('NATIONAL_ID', 'هوية وطنية'),
  IdTypeOption('IQAMA', 'إقامة'),
  IdTypeOption('PASSPORT', 'جواز سفر'),
];

/// Arabic label for a stored id-type value.
String idTypeLabel(String? value) {
  for (final t in kIdTypes) {
    if (t.value == value) return t.label;
  }
  return '';
}
