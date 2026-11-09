package main

import "testing"

func TestValidStars(t *testing.T) {
	if !validStars(map[string]int{"ayodhya": 3, "world": 0}) {
		t.Fatal("valid input rejected")
	}
	for name, m := range map[string]map[string]int{
		"too many stars": {"ayodhya": 4},
		"negative":       {"nepal": -1},
		"unknown place":  {"atlantis": 1},
	} {
		if validStars(m) {
			t.Errorf("%s accepted", name)
		}
	}
}

func TestMergeNeverLowers(t *testing.T) {
	got := mergeStars(map[string]int{"ayodhya": 1, "nepal": 2}, map[string]int{"ayodhya": 3, "nepal": 0, "goa": 1})
	want := map[string]int{"ayodhya": 3, "nepal": 2, "goa": 1}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s = %d, want %d", k, got[k], v)
		}
	}
}
