from flask import Flask, render_template

def search():
    return render_template("main/search.html")