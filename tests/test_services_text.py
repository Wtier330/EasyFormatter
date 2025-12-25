import unittest
from app.services.text_service import TextService

class TestTextService(unittest.TestCase):
    def test_format_text_metrics(self):
        svc = TextService()
        res, chars, lines, ms = svc.format_text("a,b\n12", {"remove_separators"})
        self.assertEqual(res, "ab\n12")
        self.assertEqual(chars, len(res))
        self.assertEqual(lines, 2)
        self.assertTrue(isinstance(ms, int))

