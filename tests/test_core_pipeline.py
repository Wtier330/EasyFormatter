import unittest
from app.core.pipeline import process_text

class TestPipeline(unittest.TestCase):
    def test_strip_per_line(self):
        text = "  hello  \n  world  "
        rules = {"strip_per_line"}
        expected = "hello\nworld"
        self.assertEqual(process_text(text, rules), expected)

    def test_remove_separators(self):
        text = "a,b;c，d；e、f"
        rules = {"remove_separators"}
        expected = "abcdef"
        self.assertEqual(process_text(text, rules), expected)

    def test_pipeline_combination(self):
        text = "  12, 34  \n  ab 56 ; "
        rules = {"strip_per_line", "remove_separators", "only_digits"}
        expected = "1234\n56"
        self.assertEqual(process_text(text, rules), expected)

