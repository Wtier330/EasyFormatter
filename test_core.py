from core.pipeline import process_text
import unittest

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

    def test_only_digits(self):
        text = "abc123def\n456"
        rules = {"only_digits"}
        expected = "123\n456"
        self.assertEqual(process_text(text, rules), expected)
        
    def test_pipeline_combination(self):
        # 去除空格 + 去除分隔符 + 只保留数字
        # rules.py 中的顺序:
        # 1. strip (10)
        # 2. separators (20)
        # 3. only_digits (30)
        
        text = "  12, 34  \n  ab 56 ; "
        rules = {"strip_per_line", "remove_separators", "only_digits"}
        
        # 1. 去除空格 -> "12, 34\nab 56 ;"
        # 2. 去除分隔符 -> "12 34\nab 56 "
        # 3. 只保留数字 -> "1234\n56"
        
        expected = "1234\n56"
        self.assertEqual(process_text(text, rules), expected)

if __name__ == '__main__':
    unittest.main()
