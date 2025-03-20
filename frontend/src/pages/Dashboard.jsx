import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getChats, createChat, deleteChat, getModels } from '../services/aiService';

const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const chatsPerPage = 9;
  
  const navigate = useNavigate();

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChats();
      setChats(data);
    } catch (err) {
      setError('Failed to load chats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    fetchChats();
    fetchModels();
  }, [fetchChats, refreshTrigger]);

  const fetchModels = async () => {
    try {
      const data = await getModels();
      
      // Ensure we have data and it's an array
      const modelList = Array.isArray(data) ? data : [];
      
      // If no models received, provide default options
      if (modelList.length === 0) {
        const defaultModels = [
          { name: 'llama2', modified_at: new Date().toISOString() },
          { name: 'mistral', modified_at: new Date().toISOString() }
        ];
        setModels(defaultModels);
        setSelectedModel(defaultModels[0].name);
      } else {
        setModels(modelList);
        if (modelList.length > 0) {
          setSelectedModel(modelList[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
      // Set default models on error
      const defaultModels = [
        { name: 'llama2', modified_at: new Date().toISOString() },
        { name: 'mistral', modified_at: new Date().toISOString() }
      ];
      setModels(defaultModels);
      setSelectedModel(defaultModels[0].name);
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setError(null);
      const chat = await createChat(newChatTitle, selectedModel);
      setChats([chat, ...chats]);
      setShowNewChatModal(false);
      setNewChatTitle('');
      navigate(`/chat/${chat._id}`);
    } catch (err) {
      setError('Failed to create chat');
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteConfirm = (chatId) => {
    setShowDeleteConfirm(chatId);
  };

  const handleDeleteChat = async (chatId) => {
    try {
      setDeleteLoading(chatId);
      setError(null);
      await deleteChat(chatId);
      setChats(chats.filter(chat => chat._id !== chatId));
      setShowDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete chat');
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredChats = useMemo(() => {
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chats, searchTerm]);

  // Calculate pagination
  const indexOfLastChat = currentPage * chatsPerPage;
  const indexOfFirstChat = indexOfLastChat - chatsPerPage;
  const currentChats = filteredChats.slice(indexOfFirstChat, indexOfLastChat);
  const totalPages = Math.ceil(filteredChats.length / chatsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 pt-32">


      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button 
            className="btn btn-sm btn-outline-danger"
            onClick={handleRetry}
            aria-label="Retry operation"
          >
            Retry
          </button>
        </div>
      )}

      {chats.length === 0 ? (
        <div className="dashboard-empty text-center p-5">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            fill="currentColor" 
            className="bi bi-chat-square-text text-primary mb-3 opacity-75" 
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
          </svg>
          <h3>No chats yet</h3>
          <p>Start a new conversation by clicking the "New Chat" button above.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowNewChatModal(true)}
            aria-label="Create your first chat"
          >
            Create your first chat
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="input-group">
              <span className="input-group-text" id="search-addon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  className="bi bi-search" 
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search chats by title or model..."
                aria-label="Search chats"
                aria-describedby="search-addon"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredChats.length === 0 ? (
            <div className="alert alert-info">
              No chats match your search criteria.
            </div>
          ) : (
            <>
              <div className="row">
                {currentChats.map(chat => (
                  <div className="col-md-6 col-lg-4 mb-4" key={chat._id}>
                    <div className="dashboard-card card h-100">
                      <div className="card-body">
                        <h5 className="card-title">{chat.title}</h5>
                        <div className="d-flex align-items-center mb-2">
                          <span className="badge bg-primary me-2">
                            {chat.model}
                          </span>
                          <span className="badge bg-secondary">
                            {chat.messages?.length || 0} messages
                          </span>
                        </div>
                        <p className="card-text text-muted small">
                          Last updated: {new Date(chat.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="card-footer d-flex justify-content-between">
                        <Link 
                          to={`/chat/${chat._id}`} 
                          className="btn btn-primary"
                          aria-label={`Open chat ${chat.title}`}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            fill="currentColor" 
                            className="bi bi-chat-text me-1" 
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                          >
                            <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                            <path d="M4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8zm0 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                          </svg>
                          Open
                        </Link>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteConfirm(chat._id)}
                          disabled={deleteLoading === chat._id}
                          aria-label={`Delete chat ${chat.title}`}
                        >
                          {deleteLoading === chat._id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="16" 
                              height="16" 
                              fill="currentColor" 
                              className="bi bi-trash" 
                              viewBox="0 0 16 16"
                              aria-hidden="true"
                            >
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Chat pagination" className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => paginate(currentPage - 1)}
                        aria-label="Previous page"
                      >
                        &laquo;
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, index) => (
                      <li className={`page-item ${currentPage === index + 1 ? 'active' : ''}`} key={index}>
                        <button 
                          className="page-link" 
                          onClick={() => paginate(index + 1)}
                          aria-label={`Page ${index + 1}`}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => paginate(currentPage + 1)}
                        aria-label="Next page"
                      >
                        &raquo;
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteConfirm(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this chat? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteChat(showDeleteConfirm)}
                  disabled={deleteLoading === showDeleteConfirm}
                >
                  {deleteLoading === showDeleteConfirm ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Chat</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowNewChatModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleCreateChat}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="chatTitle" className="form-label">Chat Title</label>
                    <input
                      type="text"
                      className="form-control"
                      id="chatTitle"
                      value={newChatTitle}
                      onChange={e => setNewChatTitle(e.target.value)}
                      placeholder="Enter a title for your chat"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="modelSelect" className="form-label">Select Model</label>
                    <select
                      className="form-select"
                      id="modelSelect"
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      required
                    >
                      {models.map((model, index) => (
                        <option key={model.name || model.id || index} value={model.name || model}>
                          {model.name || model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowNewChatModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary d-flex align-items-center"
                    disabled={createLoading}
                  >
                    {createLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          fill="currentColor" 
                          className="bi bi-plus-lg me-1" 
                          viewBox="0 0 16 16"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                        </svg>
                        Create Chat
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 