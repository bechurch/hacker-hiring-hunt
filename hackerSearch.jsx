import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import _ from 'lodash';
import tinycolor from 'tinycolor2';

const baseHighlightColor = "#FFD3B5";
const colorWheelIncrement = 57;

function extractColorFromWheel(baseColor, degreeIncrement, i) {
  let degreesToSpin = degreeIncrement * i;
  return tinycolor(baseColor).spin(degreesToSpin).toString();
}

function highlightWordsInHtml(line, word, color) {
      let regex = new RegExp( `(${word})`, 'gi' );
      let spanTag = `<span style="background-color: ${color}">$1</span>`;
      return line.replace(regex, spanTag);
}

var getColorFromIndex = _.memoize(index => extractColorFromWheel(baseHighlightColor, colorWheelIncrement, index));

class WhosHiringSelect extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
          threads: [],
          optionsState: ""
      };
  };

  componentDidMount() {
    this.serverRequest = $.get("http://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring", (result) => {
      this.setState({ threads: result.hits})
    })
  };

  render () {
    return (
      <form className="whosHiringSelect">
        <select ref="userInput" defaultValue="" onChange={this.props.handleSelect}>
          <option value="" disabled>Select a thread</option>
          {
            this.state.threads.map((thread => {
              return <option key={thread.objectID} value={thread.objectID}>{thread.title.replace("Ask HN: ", "")}</option>;
            }))
          }
        </select>
      </form>
    );
  }
}

class Keyword extends React.Component {
  render () {
    let applyBackground = {
      backgroundColor: getColorFromIndex(this.props.index)
    };
    return (
      <span className="keyWord" style={applyBackground}>
        <span className="keyWordText">
          {this.props.text}
        </span>
        <button onClick={() => this.props.onKeyWordRemoval(this.props.text)}>x</button>
      </span>
    );
  }
}

class KeywordFilter extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
          searchWords: []  
      };
  };

  onKeyPress (e) {
    if (e.key === 'Enter') {
      let newSearchWords = this.state.searchWords.concat(e.target.value);
      this.setState({ searchWords: newSearchWords});
      this.props.keywordsChanged(newSearchWords);
      e.target.value = '';
    }
  }

  onKeyWordRemoval(keyWord) {
    let newSearchWords = this.state.searchWords.filter(kw => kw != keyWord );
    this.setState({ searchWords: newSearchWords});
    this.props.keywordsChanged(newSearchWords);
  }

  render () {
    let keyWordNodes = this.state.searchWords.map((keyWord, i) => {
      return (
        <Keyword text={keyWord} key={keyWord} index={i} onKeyWordRemoval={this.onKeyWordRemoval.bind(this)} />
      );
    })

    return (
      <div>
        <input
          type="text"
          placeholder="Keywords to search for"
          value={this.state.searchText}
          onKeyPress={this.onKeyPress.bind(this)}
        />
      <div>{keyWordNodes}</div></div>
    );
  }
}

class CommentList extends React.Component {
  _filterComments(comment) {
    return this.props.searchWords.reduce((prev, searchWord) => {
          return prev && comment.text.toLowerCase().indexOf(searchWord.toLowerCase()) >= 0;
        }, true)
  }

  render () {
    let commentNodes = this.props.comments
      .filter(this._filterComments, this)
      .map(comment => {
        return (
          <Comment author={comment.author} key={comment.id} searchWords={this.props.searchWords}>
            {comment.text}
          </Comment>
        );
    })

    return (
      <div className="comments">
        <div className="commentCount">{commentNodes.length}</div>
        <div className="commentList">
          {commentNodes}
        </div>
      </div>
    );
  }
}


class Comment extends React.Component {
  highlightSearchWords(commentHtml) {
    this.props.searchWords.forEach((searchWord, i) => {
      commentHtml = highlightWordsInHtml(commentHtml, searchWord, getColorFromIndex(i));
    });
    return commentHtml;
  }

  rawHtml () {
    return { __html: this.highlightSearchWords(this.props.children) };
  };

  render () {
    return (
      <div className="comment">
        <h2 className="commentAuthor">
          {this.props.author}
        </h2>
        <span dangerouslySetInnerHTML={this.rawHtml()} />
      </div>
    );
  }
}

class HackerSearch extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
          comments: [],
          searchWords: [],
          id: ""  
      };
  };

  render() {
    this.serverRequest = $.get(`http://hn.algolia.com/api/v1/items/${this.state.id}`, (result) => {
        let comments = result.children
          .filter(x => x.text);
        this.setState({comments: comments})
      });
     return (
        <div className="hackerSearch">
          <h1>Hacker Search</h1>
          <WhosHiringSelect handleSelect={this.threadSelected.bind(this)}/>
          <KeywordFilter keywordsChanged={this.keywordsChanged.bind(this)}/>
          <CommentList comments={this.state.comments} searchWords={this.state.searchWords}/>
        </div>
    );
  }

  keywordsChanged(keywords) {
    this.setState({searchWords: keywords})
  }

  threadSelected(e) {
    let id = e.target.value;
    this.setState({id: id})
  }
}

ReactDOM.render(
  <HackerSearch />,
  document.getElementById('content')
);
